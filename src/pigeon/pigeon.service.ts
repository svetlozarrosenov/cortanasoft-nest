import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PigeonApiService, PigeonApiError } from './pigeon-api.service';
import {
  encryptSecret,
  decryptSecretIfNeeded,
  isEncryptedSecret,
} from '../common/utils/secret-crypto.util';
import {
  PigeonCredentials,
  PigeonSettings,
  PigeonShipmentParams,
} from './interfaces';
import {
  ShippingProvider,
  CarrierTrackingOutcome,
  CarrierTrackingResult,
  TrackableShipment,
  ShipmentOrigin,
} from '../shipping/interfaces';
import { ShippingCarrier } from '../shipping/shipping-provider.registry';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from '../shipping/dto/create-shipment.dto';
import { UpdatePigeonConfigDto } from './dto/update-pigeon-config.dto';
import { ErrorMessages } from '../common/constants/error-messages';

const PROVIDER = 'pigeon';
const MASK = '••••••••';

/**
 * Статуси на Pigeon → наши. Двата кода са от примерите в спецификацията;
 * останалите идват от GET /shipment-statuses и се допълват тук при първия
 * достъп до sandbox (TODO(pigeon-codes)). Непознат код се превежда по
 * текста (доставена/анулирана/върната), иначе остава „в транзит".
 */
export const PIGEON_STATUS_MAP: Record<string, ShipmentStatus> = {
  shipment_registered: 'CREATED',
  shipment_courier_assigned: 'IN_TRANSIT',
};

@Injectable()
@ShippingCarrier()
export class PigeonService implements ShippingProvider, OnModuleInit {
  readonly name = PROVIDER;
  private readonly logger = new Logger(PigeonService.name);

  constructor(
    private prisma: PrismaService,
    private api: PigeonApiService,
  ) {}

  // Самолечение: заварени plaintext секрети се шифроват еднократно при старт
  async onModuleInit() {
    try {
      const configs = await this.prisma.pigeonConfig.findMany({
        where: { apiSecret: { not: null } },
        select: { companyId: true, apiSecret: true },
      });
      for (const c of configs) {
        if (c.apiSecret && !isEncryptedSecret(c.apiSecret)) {
          await this.prisma.pigeonConfig.update({
            where: { companyId: c.companyId },
            data: { apiSecret: encryptSecret(c.apiSecret) },
          });
          this.logger.log(
            `Encrypted legacy Pigeon secret for company ${c.companyId}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Pigeon secret self-encryption skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ==================== ShippingProvider implementation ====================

  async isConfigured(companyId: string): Promise<boolean> {
    const config = await this.prisma.pigeonConfig.findUnique({
      where: { companyId },
      select: { isActive: true, apiKey: true, apiSecret: true },
    });
    return !!(config?.isActive && config.apiKey && config.apiSecret);
  }

  async testConnection(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.testConnection(creds));
  }

  async calculateShipping(companyId: string, dto: CalculateShippingDto) {
    const config = await this.requireConfig(companyId);
    const creds = this.configToCredentials(config);
    const settings = this.mergeSettings(this.configToSettings(config), dto);
    const params = this.toParams(dto, {
      orderNumber: 'CALC',
      receiverName: 'Test',
      receiverPhone: '0000000000',
    });

    const data = await this.call(() =>
      this.api.calculate(creds, settings, params),
    );
    return this.toPriceResult(data, settings);
  }

  async createShipment(companyId: string, dto: CreateShipmentDto, order: any) {
    const config = await this.requireConfig(companyId);
    const creds = this.configToCredentials(config);
    const settings = this.mergeSettings(this.configToSettings(config), dto);
    const params = this.toParams(dto, {
      orderNumber: order.orderNumber,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
    });

    // Създаването не връща цена — питаме преди това (неуспехът не спира етикета)
    let price: ReturnType<PigeonService['toPriceResult']> | null = null;
    try {
      price = this.toPriceResult(
        await this.api.calculate(creds, settings, params),
        settings,
      );
    } catch (err) {
      this.logger.warn(
        `Pigeon calculate before create failed: ${err instanceof Error ? err.message : err}`,
      );
    }

    const result = await this.call(() =>
      this.api.createShipment(creds, settings, params),
    );
    const reference: string | null = result?.reference_number
      ? String(result.reference_number)
      : null;
    if (!reference) {
      throw new BadRequestException('Pigeon не върна номер на пратка');
    }
    // Етикетът идва base64 в отговора, но не го пазим в базата — сервира се
    // през нашия endpoint (виж PigeonController.getLabel) при поискване.
    const { label_pdf: _label, ...carrier } = result as Record<string, unknown>;
    void _label;

    const origin = await this.originOf(creds, settings);
    const declared =
      params.declaredValueAmount && params.declaredValueAmount > 0
        ? params.declaredValueAmount
        : null;

    return this.prisma.shipment.create({
      data: {
        shipmentNumber: reference,
        status: 'CREATED',
        provider: PROVIDER,
        payer: settings.whoPays,
        deliveryType: params.deliveryKind === 'address' ? 'ADDRESS' : 'OFFICE',
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        officeCode:
          params.deliveryOfficeId != null
            ? String(params.deliveryOfficeId)
            : null,
        officeName: dto.officeName,
        addressCity: dto.addressCity,
        addressPostCode: dto.addressPostCode,
        addressStreet: dto.addressStreet,
        addressNum: dto.addressNum,
        addressOther: dto.addressOther,
        weight: dto.weight,
        packCount: dto.packCount || 1,
        dimensionsL: dto.dimensionsL,
        dimensionsW: dto.dimensionsW,
        dimensionsH: dto.dimensionsH,
        description: dto.description,
        codAmount: params.codAmount ?? 0,
        currency: dto.currency || 'EUR',
        shippingCost: price?.totalPrice ?? null,
        // Относителен път към нашия бекенд; фронтендът го разгъва с базовия URL
        pdfUrl: `/companies/${companyId}/shipping/pigeon/labels/${encodeURIComponent(reference)}`,
        expectedDeliveryDate: null,
        trackingData: JSON.parse(
          JSON.stringify({
            carrier,
            origin,
            insurance: declared
              ? {
                  amount: declared,
                  price: price?.declaredValuePrice ?? null,
                  currency: price?.currency ?? 'EUR',
                }
              : null,
            price,
            pigeon: {
              deliveryKind: params.deliveryKind,
              pickupType: settings.pickupType,
              serviceType: settings.serviceType,
              trackingNumbers: Array.isArray(result?.packages)
                ? result.packages
                    .map((p: any) => p?.tracking_number)
                    .filter(Boolean)
                : [],
            },
          }),
        ),
        orderId: dto.orderId,
        companyId,
      },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true } },
      },
    });
  }

  /**
   * Статуси на много пратки с една заявка (track/bulk, до 100). Изплатените
   * наложени платежи са в отделен отчет (payments/completed) — дърпаме го
   * веднъж за последния месец и го закачаме по номер на товарителница.
   */
  async trackShipments(
    companyId: string,
    shipments: TrackableShipment[],
  ): Promise<Map<string, CarrierTrackingOutcome>> {
    const out = new Map<string, CarrierTrackingOutcome>();
    const trackable = shipments.filter((s) => !!s.shipmentNumber);
    if (trackable.length === 0) return out;

    const creds = await this.getCredentials(companyId);
    const payouts = await this.loadRecentPayouts(creds);

    for (let i = 0; i < trackable.length; i += 100) {
      const chunk = trackable.slice(i, i + 100);
      const results = await this.api.trackBulk(
        creds,
        chunk.map((s) => s.shipmentNumber as string),
      );
      for (const s of chunk) {
        const tr = results.get(s.shipmentNumber as string);
        if (!tr) continue;
        if (tr.error || tr.success === false) {
          out.set(s.id, {
            ok: false,
            error: String(
              tr.error?.message ||
                tr.error ||
                tr.message ||
                'Pigeon не върна статус',
            ),
          });
          continue;
        }
        out.set(s.id, {
          ok: true,
          result: this.toTrackingResult(
            tr,
            s,
            payouts.get(s.shipmentNumber as string) ?? null,
          ),
        });
      }
    }
    return out;
  }

  toTrackingResult(
    tr: any,
    shipment: Pick<TrackableShipment, 'trackingData'>,
    payout: {
      amount: number;
      collectedAt: Date | null;
      paidAt: Date | null;
    } | null,
  ): CarrierTrackingResult {
    const events: any[] = Array.isArray(tr?.tracking) ? tr.tracking : [];
    const sorted = [...events].sort(
      (a, b) => toTime(b?.created_at) - toTime(a?.created_at),
    );
    const last = sorted[0];
    const code = String(tr?.status_code || last?.status_code || '');
    const text = String(tr?.status || last?.status || '');
    const deliveredAt = toDate(tr?.delivery_date);

    const status: ShipmentStatus = deliveredAt
      ? 'DELIVERED'
      : (PIGEON_STATUS_MAP[code] ??
        statusFromText(code, text) ??
        (sorted.length > 1 ? 'IN_TRANSIT' : 'CREATED'));

    const first = sorted[sorted.length - 1];
    const courierTook = sorted.find(
      (e) => String(e?.status_code) === 'shipment_courier_assigned',
    );
    const td = shipment.trackingData as any;

    return {
      status,
      shortStatus: text || null,
      events: sorted.map((e) => ({
        time: toDate(e?.created_at)?.toISOString() ?? null,
        description: [e?.status, e?.note].filter(Boolean).join(' — '),
      })),
      sentAt: courierTook
        ? toDate(courierTook.created_at)
        : first
          ? toDate(first.created_at)
          : null,
      deliveredAt,
      cod: payout
        ? {
            collectedAmount: payout.amount,
            collectedAt: payout.collectedAt,
            paidAmount: payout.amount,
            paidAt: payout.paidAt,
            currency: 'EUR',
          }
        : null,
      origin: (td?.origin as ShipmentOrigin) ?? null,
      insurance: td?.insurance ?? null,
      raw: tr,
    };
  }

  /** Анулира при Pigeon. „Не съществува" = вече я няма там, минава; друг отказ спира локалното анулиране. */
  async cancelShipment(companyId: string, shipment: any) {
    if (!shipment.shipmentNumber) return;
    const creds = await this.getCredentials(companyId);
    try {
      await this.api.cancel(creds, shipment.shipmentNumber);
    } catch (err) {
      if (err instanceof PigeonApiError && err.status === 404) {
        this.logger.warn(
          `Pigeon shipment ${shipment.shipmentNumber} already gone at Pigeon`,
        );
        return;
      }
      throw new BadRequestException(
        `${ErrorMessages.shipping.pigeonCancelFailed}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ==================== Pigeon-specific endpoints ====================

  async getCities(companyId: string, name?: string, postalCode?: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listCities(creds, { name, postalCode }));
  }

  async getStreets(companyId: string, cityId: number, name?: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listStreets(creds, cityId, name));
  }

  async getOffices(
    companyId: string,
    opts: {
      type?: 'office' | 'locker';
      name?: string;
      cityId?: number;
      postalCode?: string;
    },
  ) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listOffices(creds, opts));
  }

  async getOffice(companyId: string, officeId: number) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.getOffice(creds, officeId));
  }

  async getLockerAvailability(companyId: string, code: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.lockerAvailability(creds, code));
  }

  async getAddresses(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listAddresses(creds));
  }

  async getAdditionalServices(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listAdditionalServices(creds));
  }

  async getShipmentStatuses(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.listShipmentStatuses(creds));
  }

  /** PDF на етикета по номер на товарителница (само пратки на фирмата). */
  async getLabelByReference(
    companyId: string,
    reference: string,
  ): Promise<Buffer> {
    const shipment = await this.prisma.shipment.findFirst({
      where: { companyId, provider: PROVIDER, shipmentNumber: reference },
      select: { id: true },
    });
    if (!shipment) throw new NotFoundException('Pigeon пратка не е намерена');
    const creds = await this.getCredentials(companyId);
    return this.call(() => this.api.getLabel(creds, reference));
  }

  // ==================== Config CRUD ====================

  async getConfig(companyId: string) {
    const config = await this.prisma.pigeonConfig.findUnique({
      where: { companyId },
    });
    if (!config) return null;
    return { ...config, apiSecret: config.apiSecret ? MASK : null };
  }

  async updateConfig(companyId: string, dto: UpdatePigeonConfigDto) {
    const data: Record<string, unknown> = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.apiKey !== undefined) data.apiKey = dto.apiKey.trim();
    if (
      dto.apiSecret !== undefined &&
      dto.apiSecret !== MASK &&
      dto.apiSecret !== ''
    ) {
      // Секретът се пази шифрован (AES-256-GCM) — plaintext само в паметта
      data.apiSecret = encryptSecret(dto.apiSecret.trim());
    }
    if (dto.mode !== undefined) data.mode = dto.mode;
    if (dto.pickupType !== undefined) data.pickupType = dto.pickupType;
    if (dto.pickupOfficeId !== undefined)
      data.pickupOfficeId = dto.pickupOfficeId;
    if (dto.senderAddressId !== undefined)
      data.senderAddressId = dto.senderAddressId;
    if (dto.serviceType !== undefined) data.serviceType = dto.serviceType;
    if (dto.whoPays !== undefined) data.whoPays = dto.whoPays;
    if (dto.codEnabled !== undefined) data.codEnabled = dto.codEnabled;
    if (dto.declaredValueEnabled !== undefined)
      data.declaredValueEnabled = dto.declaredValueEnabled;
    if (dto.smsNotification !== undefined)
      data.smsNotification = dto.smsNotification;
    if (dto.returnAtMyExpense !== undefined)
      data.returnAtMyExpense = dto.returnAtMyExpense;

    const result = await this.prisma.pigeonConfig.upsert({
      where: { companyId },
      update: data,
      create: { ...(data as any), companyId },
    });
    return { ...result, apiSecret: result.apiSecret ? MASK : null };
  }

  // ==================== Helpers ====================

  /** Грешка от API-то на Pigeon → 400 с тяхния текст (не 500), за да стигне до формата. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof PigeonApiError)
        throw new BadRequestException(err.message);
      throw err;
    }
  }

  private async requireConfig(companyId: string) {
    const config = await this.prisma.pigeonConfig.findUnique({
      where: { companyId },
    });
    if (!config || !config.apiKey || !config.apiSecret || !config.isActive) {
      throw new BadRequestException(ErrorMessages.shipping.pigeonNotConfigured);
    }
    return config;
  }

  private async getCredentials(companyId: string): Promise<PigeonCredentials> {
    const config = await this.prisma.pigeonConfig.findUnique({
      where: { companyId },
    });
    if (!config)
      throw new BadRequestException(ErrorMessages.shipping.pigeonNotConfigured);
    if (!config.apiKey)
      throw new BadRequestException('Pigeon: липсва API ключ');
    if (!config.apiSecret)
      throw new BadRequestException('Pigeon: липсва API секрет');
    if (!config.isActive)
      throw new BadRequestException('Pigeon интеграцията е деактивирана');
    return this.configToCredentials(config);
  }

  private configToCredentials(config: any): PigeonCredentials {
    return {
      apiKey: config.apiKey,
      apiSecret: decryptSecretIfNeeded(config.apiSecret),
      mode: config.mode === 'live' ? 'live' : 'sandbox',
    };
  }

  private configToSettings(config: any): PigeonSettings {
    return {
      pickupType: config.pickupType || 'office',
      pickupOfficeId: config.pickupOfficeId ?? undefined,
      senderAddressId: config.senderAddressId ?? undefined,
      serviceType: config.serviceType === 'express' ? 'express' : 'standard',
      whoPays: config.whoPays === 'sender' ? 'sender' : 'receiver',
      codEnabled: !!config.codEnabled,
      declaredValueEnabled: !!config.declaredValueEnabled,
      smsNotification: !!config.smsNotification,
      returnAtMyExpense: !!config.returnAtMyExpense,
    };
  }

  /** Настройките на фирмата + override-ите от формата само за тази пратка. */
  private mergeSettings(
    db: PigeonSettings,
    dto: CalculateShippingDto | CreateShipmentDto,
  ): PigeonSettings {
    return {
      ...db,
      pickupType:
        (dto.pigeonPickupType as PigeonSettings['pickupType']) ?? db.pickupType,
      pickupOfficeId: dto.pigeonPickupOfficeId ?? db.pickupOfficeId,
      senderAddressId: dto.pigeonSenderAddressId ?? db.senderAddressId,
      serviceType:
        (dto.pigeonServiceType as PigeonSettings['serviceType']) ??
        db.serviceType,
      whoPays: dto.payer ?? db.whoPays,
      codEnabled: dto.codEnabled ?? db.codEnabled,
      declaredValueEnabled: dto.declaredValueEnabled ?? db.declaredValueEnabled,
      smsNotification: dto.smsNotification ?? db.smsNotification,
      returnAtMyExpense: dto.pigeonReturnAtMyExpense ?? db.returnAtMyExpense,
    };
  }

  /**
   * DTO → параметри за Pigeon. Теглото се разпределя поравно по пакетите,
   * размерите са едни и същи за всеки (формата ги дава общо).
   */
  private toParams(
    dto: CalculateShippingDto | CreateShipmentDto,
    who: { orderNumber: string; receiverName: string; receiverPhone: string },
  ): PigeonShipmentParams {
    const packs = Math.max(1, dto.packCount || 1);
    const perPack = Math.max(
      0.01,
      Math.round(((dto.weight || 1) / packs) * 1000) / 1000,
    );
    const kind =
      (dto.pigeonDeliveryKind as PigeonShipmentParams['deliveryKind']) ||
      (dto.deliveryType === 'ADDRESS' ? 'address' : 'office');
    const codEnabled = dto.codEnabled ?? (dto.codAmount ?? 0) > 0;
    const codAmount =
      codEnabled && (dto.codAmount ?? 0) > 0
        ? Number(dto.codAmount)
        : undefined;
    const declared =
      dto.declaredValueEnabled && (dto.declaredValueAmount ?? 0) > 0
        ? Number(dto.declaredValueAmount)
        : undefined;
    const description = 'description' in dto ? dto.description : undefined;
    const items = 'items' in dto ? dto.items : undefined;

    return {
      orderNumber: who.orderNumber,
      receiverName: who.receiverName,
      receiverPhone: who.receiverPhone,
      receiverEmail: dto.receiverEmail || undefined,
      deliveryKind: kind,
      deliveryOfficeId: kind !== 'address' ? dto.pigeonOfficeId : undefined,
      deliveryAddress:
        kind === 'address' && dto.pigeonCityId
          ? {
              cityId: dto.pigeonCityId,
              streetId: dto.pigeonStreetId,
              streetNumber: dto.addressNum || undefined,
              entrance: dto.pigeonEntrance || undefined,
              floor: dto.pigeonFloor || undefined,
              apartment: dto.pigeonApartment || undefined,
              postalCode: dto.addressPostCode || undefined,
              // Без улица от номенклатурата: свободният текст на адреса
              additionalInfo: dto.pigeonStreetId
                ? dto.pigeonAdditionalInfo || undefined
                : dto.pigeonAdditionalInfo || dto.addressStreet || undefined,
            }
          : undefined,
      packages: Array.from({ length: packs }, () => ({
        weight: perPack,
        length: dto.dimensionsL || undefined,
        width: dto.dimensionsW || undefined,
        height: dto.dimensionsH || undefined,
        description: description || undefined,
      })),
      inventoryItems: items?.length
        ? items.map((it) => ({
            description: it.description,
            quantity: it.count,
            unitPrice: it.price,
            unitWeight: it.weight,
          }))
        : undefined,
      codAmount,
      declaredValueAmount: declared,
      note: dto.note || undefined,
    };
  }

  /** ShipmentCalculation → { totalPrice, разбивка } в един и същ формат за модала. */
  private toPriceResult(data: any, settings: PigeonSettings) {
    const fees: Array<{ name: string; amount: number }> = Array.isArray(
      data?.service_fees,
    )
      ? data.service_fees
      : Array.isArray(data?.fees)
        ? data.fees
        : [];
    const shipping = Number(data?.shipping_price) || 0;
    const total =
      Number(data?.total_price) ||
      shipping + (Number(data?.total_service_fees) || 0);
    const declaredFee = fees.find((f) =>
      /обявена|застрах|declared|insur/i.test(String(f?.name || '')),
    );
    return {
      totalPrice: Math.round(total * 100) / 100,
      currency: String(data?.currency || 'EUR'),
      serviceType: String(data?.service_type || settings.serviceType),
      shippingPrice: shipping,
      serviceFees: Number(data?.total_service_fees) || 0,
      declaredValuePrice: declaredFee
        ? Number(declaredFee.amount) || null
        : null,
      // Разбивката в общия формат на модала: услуга + цена
      services: [
        { type: 'COURIER', description: 'Куриерска услуга', price: shipping },
        ...fees.map((f) => ({
          type: 'FEE',
          description: String(f?.name || ''),
          price: Number(f?.amount) || 0,
        })),
      ],
      raw: data,
    };
  }

  /** Откъде тръгва пратката: офис/автомат на Pigeon или запазен адрес на подателя. */
  private async originOf(
    creds: PigeonCredentials,
    settings: PigeonSettings,
  ): Promise<ShipmentOrigin | null> {
    try {
      if (settings.pickupType !== 'address' && settings.pickupOfficeId) {
        const office = await this.api.getOffice(creds, settings.pickupOfficeId);
        return {
          officeCode: String(settings.pickupOfficeId),
          officeName: office?.name
            ? `${office.name}${office.city?.name ? `, ${office.city.name}` : ''}`
            : null,
          address: office?.address ?? null,
        };
      }
      const addresses = await this.api.listAddresses(creds);
      const chosen =
        addresses.find((a) => a?.id === settings.senderAddressId) ??
        addresses.find((a) => a?.is_default) ??
        null;
      return chosen
        ? {
            officeCode: null,
            officeName: null,
            address: String(chosen.label || ''),
          }
        : null;
    } catch {
      return null;
    }
  }

  /** Изплатените НП за последния месец, по номер на товарителница. */
  private async loadRecentPayouts(
    creds: PigeonCredentials,
  ): Promise<
    Map<
      string,
      { amount: number; collectedAt: Date | null; paidAt: Date | null }
    >
  > {
    const map = new Map<
      string,
      { amount: number; collectedAt: Date | null; paidAt: Date | null }
    >();
    try {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 30);
      const rows = await this.api.listCompletedPayments(
        creds,
        isoDate(from),
        isoDate(to),
      );
      for (const r of rows) {
        const amount = Number(String(r.amount_eur).replace(',', '.')) || 0;
        if (!r.waybill || amount <= 0) continue;
        map.set(String(r.waybill), {
          amount,
          collectedAt: parseDmy(r.collected_date),
          paidAt: parseDmy(r.paid_date),
        });
      }
    } catch (err) {
      this.logger.warn(
        `Pigeon payments/completed skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
    return map;
  }
}

function statusFromText(code: string, text: string): ShipmentStatus | null {
  const s = `${code} ${text}`.toLowerCase();
  if (/(cancel|anul|анулир|отказан)/.test(s)) return 'CANCELLED';
  if (/(return|върн)/.test(s)) return 'RETURNED';
  if (
    /(deliver|достав)/.test(s) &&
    !/(not|не ?достав|undeliver|неуспеш)/.test(s)
  )
    return 'DELIVERED';
  if (/(registered|създаден)/.test(s)) return 'CREATED';
  if (/(courier|transit|hub|office|куриер|път|склад|офис|сортир)/.test(s))
    return 'IN_TRANSIT';
  return null;
}

function toTime(v: unknown): number {
  const d = toDate(v);
  return d ? d.getTime() : 0;
}

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Pigeon дава датите в отчета като d-m-Y. */
function parseDmy(v: string | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v.trim());
  if (!m) return toDate(v);
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
