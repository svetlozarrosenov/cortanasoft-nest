import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { ShippingProvider } from './interfaces';
import { ShippingProviderRegistry } from './shipping-provider.registry';
import { ShipmentSyncService } from './shipment-sync.service';
import { ErrorMessages } from '../common/constants/error-messages';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from './dto/create-shipment.dto';
import { QueryShipmentsDto } from './dto/query-shipments.dto';

const SHIPMENT_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      // За колоната „Плащане" в ERP > Пратки
      total: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  },
} as const;

/**
 * Orchestrator service. Не знае нищо за конкретните carrier API-та —
 * делегира към ShippingProvider имплементациите през регистъра.
 *
 * За добавяне на нов carrier (напр. Pigeon):
 *   1. PigeonModule + PigeonService implements ShippingProvider, с @ShippingCarrier()
 *   2. PigeonConfig модел в Prisma schema + страница в Настройки
 *   3. Импорт на PigeonModule в ShippingModule (за инстанциране) — нищо друго
 *      в общия код не се променя: регистърът го намира по декоратора, а
 *      Shipment.provider казва кой клас отговаря за всяка пратка.
 */
@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,
    private registry: ShippingProviderRegistry,
    private sync: ShipmentSyncService,
    private webhookDispatcher: WebhookDispatcherService,
  ) {}

  private getProvider(name: string): ShippingProvider {
    const provider = this.registry.get(name);
    if (!provider) {
      throw new BadRequestException(`Неподдържан превозвач: ${name}`);
    }
    return provider;
  }

  /** Куриерите с активна конфигурация за фирмата (за меню/модал). */
  async enabledProviders(companyId: string) {
    const list = await this.registry.enabledFor(companyId);
    return list.map((p) => ({ name: p.name }));
  }

  // ==================== Делегиране към providers ====================

  async calculateShipping(
    companyId: string,
    provider: string,
    dto: CalculateShippingDto,
  ) {
    return this.getProvider(provider).calculateShipping(companyId, dto);
  }

  async createShipment(companyId: string, dto: CreateShipmentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundException('Поръчката не е намерена');
    }

    // Една активна товарителница на продажба: втора се издава само след
    // анулиране на първата (иначе се плаща два пъти и стоката тръгва два пъти).
    const active = await this.prisma.shipment.findFirst({
      where: { orderId: order.id, companyId, status: { not: 'CANCELLED' } },
      select: { shipmentNumber: true, id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (active) {
      throw new BadRequestException(
        ErrorMessages.shipping.activeShipmentExists(
          active.shipmentNumber ?? active.id,
        ),
      );
    }

    // Опис на стоките (без услугите) и номер/дата на издадена фактура —
    // Еконт ги иска при наложен платеж по споразумение „по департамент".
    if (!dto.items || dto.items.length === 0) {
      dto.items = order.items
        .filter((it) => it.product && it.product.type !== 'SERVICE')
        .map((it) => ({
          inventoryNum: it.product.sku || undefined,
          description: it.product.name,
          count: Number(it.quantity) || 1,
          price: Number(it.unitPrice) || undefined,
          weight: it.product.weight != null ? Number(it.product.weight) || undefined : undefined,
        }));
    }
    const invoice = await this.prisma.invoice.findFirst({
      where: { companyId, orderId: order.id, status: { not: 'CANCELLED' }, type: { in: ['REGULAR', 'FINAL'] } },
      orderBy: { invoiceDate: 'desc' },
      select: { invoiceNumber: true, invoiceDate: true },
    });
    const dtoWithInvoice = {
      ...dto,
      invoiceNum: invoice ? econtInvoiceRef(invoice.invoiceNumber, invoice.invoiceDate) : undefined,
    };

    const shipment = await this.getProvider(dto.provider).createShipment(
      companyId,
      dtoWithInvoice,
      order,
    );

    // Куриерът на продажбата се извежда от етикета — във формата няма
    // поле „начин на доставка"; списъкът/„за изпращане" филтрират по него.
    // Наложен платеж = част от етикета: с НП > 0 продажбата става COD, а
    // етикет без НП върху COD продажба я връща на банков превод (чака се
    // плащане). Платена продажба не се пипа.
    const codOnLabel = Number(dto.codAmount) > 0;
    const paymentMethod =
      codOnLabel && order.paymentMethod !== 'COD'
        ? 'COD'
        : !codOnLabel && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID'
          ? 'BANK_TRANSFER'
          : undefined;
    if (order.deliveryMethod !== dto.provider || paymentMethod) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryMethod: dto.provider,
          ...(paymentMethod ? { paymentMethod } : {}),
        },
      });
    }

    // Уведомяваме shop-а (ако поръчката е от там): order.changed вече носи
    // shipmentNumber, така че клиентът вижда проследяване на сайта. За
    // чисто кортана поръчки (без externalId) emit-ът е no-op.
    await this.webhookDispatcher.emitOrderChanged(companyId, dto.orderId);

    return shipment;
  }

  /**
   * ERP > Пратки: всички товарителници на фирмата. Филтри и страниране на
   * сървъра; обобщението е за цялата фирма, не за текущия филтър.
   */
  async findAll(companyId: string, query: QueryShipmentsDto) {
    const {
      search,
      status,
      provider,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ShipmentWhereInput = { companyId };
    if (status) where.status = status as ShipmentStatus;
    if (provider) where.provider = provider;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        // „до дата" включително → строго преди следващия ден
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      where.OR = [
        { shipmentNumber: { contains: search } },
        { receiverName: contains },
        { receiverPhone: { contains: search } },
        { officeName: contains },
        { addressCity: contains },
        { order: { orderNumber: contains } },
        { order: { customerName: contains } },
      ];
    }

    const [items, total, byStatus, automation] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: SHIPMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.sync.getAutomation(companyId),
    ]);

    const count = (s: ShipmentStatus) =>
      byStatus.find((g) => g.status === s)?._count._all ?? 0;
    const summary = {
      total: byStatus.reduce((sum, g) => sum + g._count._all, 0),
      active: count('PENDING') + count('CREATED') + count('IN_TRANSIT'),
      delivered: count('DELIVERED'),
      cancelled: count('CANCELLED') + count('RETURNED'),
    };

    return {
      items,
      summary,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        lastSyncAt: automation.lastSyncAt?.toISOString() ?? null,
      },
    };
  }

  async getOrderShipments(companyId: string, orderId: string) {
    return this.prisma.shipment.findMany({
      where: { companyId, orderId },
      include: SHIPMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Една пратка от куриера + прилагане на автоматиките (виж ShipmentSyncService). */
  async trackShipment(companyId: string, shipmentId: string) {
    try {
      return await this.sync.syncOne(companyId, shipmentId);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new BadRequestException(
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /** Всички отворени пратки на фирмата от всички куриери. */
  syncShipments(companyId: string) {
    return this.sync.syncCompany(companyId);
  }

  async cancelShipment(companyId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
    });
    if (!shipment) {
      throw new NotFoundException('Пратката не е намерена');
    }
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      throw new BadRequestException(
        'Не може да се анулира доставена или вече анулирана пратка',
      );
    }

    await this.getProvider(shipment.provider).cancelShipment(
      companyId,
      shipment,
    );

    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'CANCELLED' },
      include: SHIPMENT_INCLUDE,
    });
  }
}

/**
 * Еконт: „номер на фактура (до 11 цифри) и дата (31.12.21)". Нашите номера
 * са вида 0000000010 → взимаме само цифрите (до 11) + датата във формат дд.мм.гг.
 */
function econtInvoiceRef(invoiceNumber: string, invoiceDate: Date): string | undefined {
  const digits = invoiceNumber.replace(/\D/g, '').slice(-11);
  if (!digits) return undefined;
  const d = invoiceDate;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${digits} ${dd}.${mm}.${yy}`;
}
