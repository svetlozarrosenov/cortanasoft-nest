import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ShippingProviderRegistry } from './shipping-provider.registry';
import { CarrierTrackingResult, TrackableShipment } from './interfaces';

/** Пратки, за които има смисъл да питаме куриера. */
const OPEN_STATUSES: ShipmentStatus[] = ['PENDING', 'CREATED', 'IN_TRANSIT'];

/** Продажби, които автоматиката може да мести напред по доставката. */
const ORDER_CAN_SHIP: string[] = ['CONFIRMED', 'PROCESSING'];
const ORDER_CAN_DELIVER: string[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED'];

const SHIPMENT_SELECT = {
  id: true,
  orderId: true,
  provider: true,
  shipmentNumber: true,
  status: true,
  trackingData: true,
  currency: true,
} as const;

type SyncShipment = Prisma.ShipmentGetPayload<{
  select: typeof SHIPMENT_SELECT;
}>;

export interface SyncReport {
  checked: number;
  updated: number;
  errors: string[];
  syncedAt: string;
}

/**
 * Синхронизация на пратките с куриерите: пита всеки куриер за неговите
 * отворени пратки (една заявка за куриер), записва статус/събития и, ако
 * фирмата е включила автоматиките, мести продажбата и записва плащането по
 * наложен платеж. Не знае кой куриер е кой — минава през регистъра.
 */
@Injectable()
export class ShipmentSyncService {
  private readonly logger = new Logger(ShipmentSyncService.name);

  constructor(
    private prisma: PrismaService,
    private registry: ShippingProviderRegistry,
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
  ) {}

  async getAutomation(companyId: string) {
    const row = await this.prisma.shippingAutomation.findUnique({
      where: { companyId },
    });
    return (
      row ?? {
        companyId,
        syncStatuses: false,
        markOrdersDelivered: false,
        recordCodPayments: false,
        lastSyncAt: null as Date | null,
      }
    );
  }

  /** Всички отворени пратки на фирмата, групирани по куриер. */
  async syncCompany(companyId: string): Promise<SyncReport> {
    const automation = await this.getAutomation(companyId);
    const open = await this.prisma.shipment.findMany({
      where: {
        companyId,
        shipmentNumber: { not: null },
        status: { in: OPEN_STATUSES },
      },
      select: SHIPMENT_SELECT,
    });

    const byProvider = new Map<string, SyncShipment[]>();
    for (const s of open) {
      byProvider.set(s.provider, [...(byProvider.get(s.provider) ?? []), s]);
    }

    const report: SyncReport = {
      checked: open.length,
      updated: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };

    for (const [providerName, shipments] of byProvider) {
      const provider = this.registry.get(providerName);
      if (!provider) {
        report.errors.push(`Неподдържан куриер: ${providerName}`);
        continue;
      }
      if (!(await provider.isConfigured(companyId))) continue;

      let outcomes;
      try {
        outcomes = await provider.trackShipments(companyId, shipments);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Sync ${providerName} за ${companyId}: ${msg}`);
        report.errors.push(`${providerName}: ${msg}`);
        continue;
      }

      for (const s of shipments) {
        const outcome = outcomes.get(s.id);
        if (!outcome) continue;
        if (!outcome.ok) {
          report.errors.push(`${s.shipmentNumber}: ${outcome.error}`);
          continue;
        }
        try {
          await this.apply(companyId, s, outcome.result, automation);
          report.updated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Sync apply ${s.shipmentNumber}: ${msg}`);
          report.errors.push(`${s.shipmentNumber}: ${msg}`);
        }
      }
    }

    // Фирма без пратки и без настройки не получава запис — нищо не се
    // променя за тенанти, които не ползват куриери.
    if (open.length > 0 || 'id' in automation) {
      await this.prisma.shippingAutomation.upsert({
        where: { companyId },
        update: { lastSyncAt: new Date(report.syncedAt) },
        create: { companyId, lastSyncAt: new Date(report.syncedAt) },
      });
    }
    return report;
  }

  /** Една пратка (бутон „Проследи" в продажбата). Връща новите tracking данни. */
  async syncOne(companyId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
      select: SHIPMENT_SELECT,
    });
    if (!shipment) throw new NotFoundException('Пратката не е намерена');
    if (!shipment.shipmentNumber) {
      throw new NotFoundException('Пратката няма номер за проследяване');
    }
    const provider = this.registry.get(shipment.provider);
    if (!provider) {
      throw new NotFoundException(`Неподдържан куриер: ${shipment.provider}`);
    }
    const outcomes = await provider.trackShipments(companyId, [shipment]);
    const outcome = outcomes.get(shipment.id);
    if (!outcome) return null;
    if (!outcome.ok) throw new Error(outcome.error);

    const automation = await this.getAutomation(companyId);
    return this.apply(companyId, shipment, outcome.result, automation);
  }

  // ==================== Прилагане на резултата ====================

  private async apply(
    companyId: string,
    shipment: SyncShipment,
    r: CarrierTrackingResult,
    automation: { markOrdersDelivered: boolean; recordCodPayments: boolean },
  ) {
    const previous =
      shipment.trackingData && typeof shipment.trackingData === 'object'
        ? (shipment.trackingData as Record<string, unknown>)
        : {};
    const trackingData = {
      ...previous,
      carrier: r.raw,
      trackingEvents: r.events,
      shortDeliveryStatus: r.shortStatus,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      cod: r.cod,
      ...(r.origin ? { origin: r.origin } : {}),
      ...(r.insurance ? { insurance: r.insurance } : {}),
      trackedAt: new Date().toISOString(),
    };
    // Prisma Json: Date-ове вътре се сериализират към ISO при запис
    const trackingJson = JSON.parse(
      JSON.stringify(trackingData),
    ) as Prisma.InputJsonObject;

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        trackingData: trackingJson,
        ...(r.status !== shipment.status ? { status: r.status } : {}),
      },
    });

    if (automation.markOrdersDelivered) {
      await this.applyOrderStatus(companyId, shipment.orderId, r);
    }
    if (automation.recordCodPayments) {
      await this.applyCodPayment(companyId, shipment, r);
    }
    return trackingJson;
  }

  /**
   * Приета от куриера → продажбата „Изпратена"; доставена → „Доставена".
   * Само напред и само от статуси със стока (потвърдена/обработва се/
   * изпратена): чернова или чакаща не се мести от фонова задача, защото
   * влизането в доставена изписва склада и заключва редакцията.
   */
  private async applyOrderStatus(
    companyId: string,
    orderId: string,
    r: CarrierTrackingResult,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, companyId },
      select: { id: true, status: true, orderNumber: true },
    });
    if (!order) return;

    if (r.status === 'DELIVERED' && ORDER_CAN_DELIVER.includes(order.status)) {
      await this.ordersService.update(companyId, orderId, {
        status: 'DELIVERED',
        deliveredAt: (r.deliveredAt ?? new Date()).toISOString(),
      });
      this.logger.log(`Продажба ${order.orderNumber} → DELIVERED от куриера`);
    } else if (
      r.status === 'IN_TRANSIT' &&
      ORDER_CAN_SHIP.includes(order.status)
    ) {
      await this.ordersService.update(companyId, orderId, {
        status: 'SHIPPED',
        shippedAt: (r.sentAt ?? new Date()).toISOString(),
      });
      this.logger.log(`Продажба ${order.orderNumber} → SHIPPED от куриера`);
    }
  }

  /**
   * Изплатен наложен платеж → плащане по продажбата с метод COD и
   * референция към пратката (идемпотентно: второ обновяване не го дублира).
   * Записва се при ИЗПЛАЩАНЕ към търговеца, не при събиране от получателя.
   */
  private async applyCodPayment(
    companyId: string,
    shipment: SyncShipment,
    r: CarrierTrackingResult,
  ) {
    const paid = r.cod?.paidAmount;
    if (!paid || paid <= 0 || !r.cod?.paidAt) return;

    const reference = `${shipment.provider.toUpperCase()} НП ${shipment.shipmentNumber}`;
    const existing = await this.prisma.payment.findFirst({
      where: { companyId, orderId: shipment.orderId, reference },
      select: { id: true },
    });
    if (existing) return;

    await this.paymentsService.create(companyId, null, {
      orderId: shipment.orderId,
      amount: paid,
      paidAt: r.cod.paidAt.toISOString(),
      method: 'COD' as any,
      reference,
      notes: 'Записано автоматично от проследяването на пратката',
    });
    this.logger.log(
      `Плащане по НП ${paid} ${r.cod.currency ?? ''} за пратка ${shipment.shipmentNumber}`,
    );
  }

  /** Фирмите с включено автоматично обновяване (за cron-а). */
  async companiesWithAutoSync(): Promise<string[]> {
    const rows = await this.prisma.shippingAutomation.findMany({
      where: { syncStatuses: true },
      select: { companyId: true },
    });
    return rows.map((r) => r.companyId);
  }
}
