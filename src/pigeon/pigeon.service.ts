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
  PigeonAddressParams,
  PigeonInventoryItemParams,
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
 * Pigeon's statuses → ours: every code GET /shipment-statuses returned on
 * 2026-11-23. Only "taken by the recipient" is delivered and only "returned"
 * is returned; everything on the way, waiting in an office or locker, or in
 * trouble stays "in transit" with Pigeon's own text shown next to it. A code
 * Pigeon adds later is read from its text (see statusFromText).
 */
export const PIGEON_STATUS_MAP: Record<string, ShipmentStatus> = {
  shipment_registered: 'CREATED',
  shipment_awaiting_courier_pickup: 'CREATED',
  shipment_courier_assigned: 'IN_TRANSIT',
  shipment_accepted_by_courier: 'IN_TRANSIT',
  shipment_accepted_in_office: 'IN_TRANSIT',
  shipment_left_in_locker: 'IN_TRANSIT',
  shipment_in_sorting_center: 'IN_TRANSIT',
  shipment_in_delivery: 'IN_TRANSIT',
  shipment_delivery_attempt_failed: 'IN_TRANSIT',
  shipment_delivery_problem: 'IN_TRANSIT',
  shipment_delivered_to_office: 'IN_TRANSIT',
  shipment_held_by_sender: 'IN_TRANSIT',
  shipment_untracked: 'IN_TRANSIT',
  shipment_locker_time_expired: 'IN_TRANSIT',
  shipment_storage_expired: 'IN_TRANSIT',
  shipment_abandoned: 'IN_TRANSIT',
  shipment_awaiting_documents: 'IN_TRANSIT',
  shipment_redirection_requested: 'IN_TRANSIT',
  shipment_redirection_rejected: 'IN_TRANSIT',
  shipment_redirected: 'IN_TRANSIT',
  shipment_returning_to_sender: 'IN_TRANSIT',
  shipment_lost: 'IN_TRANSIT',
  shipment_found: 'IN_TRANSIT',
  shipment_written_off: 'IN_TRANSIT',
  complaint: 'IN_TRANSIT',
  shipment_delivered_to_recipient: 'DELIVERED',
  shipment_returned: 'RETURNED',
  shipment_cancelled: 'CANCELLED',
};

/** The courier, an office or a locker has the parcel: it has left the sender. */
const PIGEON_HANDED_OVER = new Set([
  'shipment_courier_assigned',
  'shipment_accepted_by_courier',
  'shipment_accepted_in_office',
  'shipment_left_in_locker',
]);

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

    const data = await this.call(async () =>
      this.api.calculate(
        creds,
        settings,
        params,
        await this.pickupAddressOf(creds, settings),
      ),
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

    // The same address the price was calculated from, named by its id
    if (settings.pickupType === 'address' && !settings.senderAddressId) {
      settings.senderAddressId = (
        await this.call(() => this.senderAddressOf(creds, settings))
      ).id;
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

    // Creating does not return the price; the shipment itself does, with the
    // fees one by one. The label exists either way, so a failure here only
    // leaves the cost empty.
    let price: ReturnType<PigeonService['toPriceResult']> | null = null;
    try {
      const created = await this.api.getShipment(creds, reference);
      price = this.toPriceResult(
        {
          shipping_price: created?.pricing?.courier_service,
          total_price: created?.pricing?.total,
          total_service_fees:
            (Number(created?.pricing?.total) || 0) -
            (Number(created?.pricing?.courier_service) || 0),
          fees: created?.pricing?.fees,
          currency: created?.cod?.currency,
          service_type: created?.service_type,
        },
        settings,
      );
    } catch (err) {
      this.logger.warn(
        `Pigeon price of ${reference} not read: ${err instanceof Error ? err.message : err}`,
      );
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
        expectedDeliveryDate: await this.expectedDeliveryOf(creds, reference),
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

    // A known code decides. The delivery date and the text are only for a
    // code Pigeon has added since.
    const status: ShipmentStatus =
      PIGEON_STATUS_MAP[code] ??
      (deliveredAt
        ? 'DELIVERED'
        : (statusFromText(code, text) ??
          (sorted.length > 1 ? 'IN_TRANSIT' : 'CREATED')));

    // Oldest first: the moment the parcel first left the sender
    const handedOver = [...sorted]
      .reverse()
      .find((e) => PIGEON_HANDED_OVER.has(String(e?.status_code)));
    const td = shipment.trackingData as any;

    return {
      status,
      shortStatus: text || null,
      events: sorted.map((e) => ({
        time: toDate(e?.created_at)?.toISOString() ?? null,
        description: [e?.status, e?.note].filter(Boolean).join(' — '),
      })),
      sentAt: handedOver ? toDate(handedOver.created_at) : null,
      deliveredAt: status === 'DELIVERED' ? deliveredAt : null,
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
      // Pigeon refuses to cancel twice; a shipment it already has as
      // cancelled is what we wanted
      if (await this.isCancelledAtPigeon(creds, shipment.shipmentNumber))
        return;
      throw new BadRequestException(
        `${ErrorMessages.shipping.pigeonCancelFailed}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ==================== Pigeon-specific endpoints ====================

  async getCities(companyId: string, name?: string, postalCode?: string) {
    const creds = await this.getCredentials(companyId);
    const cities = await this.call(() =>
      this.api.listCities(creds, { name, postalCode }),
    );
    return name ? bestCitiesFirst(cities, name) : cities;
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
    const query = opts.name?.trim();
    if (!query || query.length < 2 || opts.cityId) {
      return this.call(() => this.api.listOffices(creds, opts));
    }
    // People look an office up by its town, and Pigeon's own search is by the
    // office's name only: the offices of the towns the text matches are added
    return this.call(async () => {
      const [byName, cities] = await Promise.all([
        this.api.listOffices(creds, opts),
        this.api.listCities(creds, { name: query }),
      ]);
      const towns = bestCitiesFirst(cities, query)
        .filter((c) => startsWithText(c?.name, query))
        .slice(0, OFFICE_SEARCH_TOWNS);
      const byTown = await Promise.all(
        towns.map((c) =>
          this.api.listOffices(creds, { type: opts.type, cityId: c.id }),
        ),
      );
      const seen = new Set<number>();
      return [...byTown.flat(), ...byName].filter((o) => {
        if (seen.has(o?.id)) return false;
        seen.add(o?.id);
        return true;
      });
    });
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
    return this.maskConfig(config);
  }

  /**
   * The form for a shipment reads the config too, so neither the secret nor
   * the whole key leaves the server.
   */
  private maskConfig<
    T extends { apiKey: string | null; apiSecret: string | null },
  >(config: T): T {
    return {
      ...config,
      apiKey: config.apiKey ? maskKey(config.apiKey) : null,
      apiSecret: config.apiSecret ? MASK : null,
    };
  }

  async updateConfig(companyId: string, dto: UpdatePigeonConfigDto) {
    const data: Record<string, unknown> = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    // The masked key shown in the form comes back unchanged: keep the stored one
    if (dto.apiKey !== undefined && !dto.apiKey.includes('•'))
      data.apiKey = dto.apiKey.trim();
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
    return this.maskConfig(result);
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
    // Pigeon prices by volume too: it refuses a package without all three
    if (!dto.dimensionsL || !dto.dimensionsW || !dto.dimensionsH) {
      throw new BadRequestException(
        ErrorMessages.shipping.pigeonDimensionsRequired,
      );
    }

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
      // Pigeon requires a list of what is inside; without the sale's lines
      // the description of the parcel stands for it
      inventoryItems: items?.length
        ? items.map(toInventoryItem)
        : [{ description: description || who.orderNumber, quantity: 1 }],
      codAmount,
      declaredValueAmount: declared,
      note: dto.note || undefined,
    };
  }

  /** ShipmentCalculation → { totalPrice, разбивка } в един и същ формат за модала. */
  private toPriceResult(data: any, settings: PigeonSettings) {
    const fees: Array<{ code?: string; name: string; amount: number }> =
      Array.isArray(data?.service_fees)
        ? data.service_fees
        : Array.isArray(data?.fees)
          ? data.fees
          : [];
    const shipping = Number(data?.shipping_price) || 0;
    const total =
      Number(data?.total_price) ||
      shipping + (Number(data?.total_service_fees) || 0);
    const declaredFee = fees.find(
      (f) =>
        f?.code === 'insurance_required' ||
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
        // A calculation gives the fees as one sum; the shipment, once
        // created, lists them one by one
        ...(fees.length === 0 && Math.round((total - shipping) * 100) > 0
          ? [
              {
                type: 'FEE',
                description: 'Такси и допълнителни услуги',
                price: Math.round((total - shipping) * 100) / 100,
              },
            ]
          : []),
      ],
      raw: data,
    };
  }

  /**
   * The sender's address for a price calculation, when the courier collects
   * from an address: the saved address chosen in the settings, or the
   * profile's default one.
   */
  private async pickupAddressOf(
    creds: PigeonCredentials,
    settings: PigeonSettings,
  ): Promise<PigeonAddressParams | undefined> {
    if (settings.pickupType !== 'address') return undefined;
    const address = (await this.senderAddressOf(creds, settings)).address;
    return {
      cityId: Number(address.city_id),
      streetId: address.street_id ?? undefined,
      streetNumber: address.street_number ?? undefined,
      postalCode: address.postal_code ?? undefined,
    };
  }

  /**
   * The saved address the courier collects from: the one chosen in the
   * settings, otherwise the profile's default, otherwise its only one. Pigeon
   * itself falls back only to a default, and a profile need not have one.
   */
  private async senderAddressOf(
    creds: PigeonCredentials,
    settings: PigeonSettings,
  ): Promise<{ id: number; address: Record<string, any> }> {
    const addresses = await this.api.listAddresses(creds);
    const chosen = settings.senderAddressId
      ? addresses.find((a) => a?.id === settings.senderAddressId)
      : (addresses.find((a) => a?.is_default) ?? addresses[0]);
    if (!chosen?.address?.city_id) {
      throw new BadRequestException(
        ErrorMessages.shipping.pigeonNoSenderAddress,
      );
    }
    return chosen;
  }

  /** When Pigeon expects to deliver; known only from the tracking. */
  private async expectedDeliveryOf(
    creds: PigeonCredentials,
    reference: string,
  ): Promise<Date | null> {
    try {
      const tracked = await this.api.track(creds, reference);
      return toDate(tracked?.expected_delivery_date);
    } catch {
      return null;
    }
  }

  private async isCancelledAtPigeon(
    creds: PigeonCredentials,
    reference: string,
  ): Promise<boolean> {
    try {
      const tracked = await this.api.track(creds, reference);
      return tracked?.status_code === 'shipment_cancelled';
    } catch {
      return false;
    }
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

/** How many matching towns an office search looks into. */
const OFFICE_SEARCH_TOWNS = 3;

function startsWithText(value: unknown, text: string): boolean {
  return String(value ?? '')
    .toLowerCase()
    .startsWith(text.trim().toLowerCase());
}

/** The exact name first, then names starting with the text, towns before villages. */
function bestCitiesFirst<T extends { name?: string; type?: string }>(
  cities: T[],
  text: string,
): T[] {
  const query = text.trim().toLowerCase();
  const rank = (c: T) => {
    const name = String(c?.name ?? '').toLowerCase();
    const town = c?.type === 'град' ? 0 : 1;
    return (name === query ? 0 : name.startsWith(query) ? 2 : 4) + town;
  };
  return [...cities].sort((a, b) => rank(a) - rank(b));
}

/**
 * A line of the sale as Pigeon lists it. Pigeon counts whole pieces only, so
 * 1.5 m of cable goes as one item with the amount in its name and the price
 * and weight of the whole line.
 */
function toInventoryItem(it: {
  description: string;
  count: number;
  price?: number;
  weight?: number;
}): PigeonInventoryItemParams {
  const count = Number(it.count) || 1;
  if (Number.isInteger(count) && count >= 1) {
    return {
      description: it.description,
      quantity: count,
      unitPrice: it.price,
      unitWeight: it.weight,
    };
  }
  return {
    description: `${it.description} (${count})`,
    quantity: 1,
    unitPrice: it.price != null ? it.price * count : undefined,
    unitWeight:
      it.weight != null
        ? Math.round(it.weight * count * 1000) / 1000
        : undefined,
  };
}

function maskKey(key: string): string {
  return key.length > 12 ? `${key.slice(0, 8)}••••${key.slice(-4)}` : MASK;
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
