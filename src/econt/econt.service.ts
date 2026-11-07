import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcontApiService } from './econt-api.service';
import {
  encryptSecret,
  decryptSecretIfNeeded,
  isEncryptedSecret,
} from '../common/utils/secret-crypto.util';
import { EcontCredentials, EcontSettings } from './interfaces';
import {
  ShippingProvider,
  CarrierTrackingOutcome,
  CarrierTrackingResult,
  TrackableShipment,
  ShipmentOrigin,
  ShipmentInsurance,
} from '../shipping/interfaces';
import { ShippingCarrier } from '../shipping/shipping-provider.registry';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from '../shipping/dto/create-shipment.dto';
import { UpdateEcontConfigDto } from './dto/update-econt-config.dto';
import { ErrorMessages } from '../common/constants/error-messages';

const PROVIDER = 'econt';


@Injectable()
@ShippingCarrier()
export class EcontService implements ShippingProvider, OnModuleInit {
  readonly name = PROVIDER;
  private readonly logger = new Logger(EcontService.name);

  constructor(
    private prisma: PrismaService,
    private api: EcontApiService,
  ) {}

  // Самолечение: заварени plaintext пароли (отпреди шифроването) се
  // шифроват еднократно при старт — без ръчна миграция при deploy.
  async onModuleInit() {
    try {
      const configs = await this.prisma.econtConfig.findMany({
        where: { password: { not: null } },
        select: { companyId: true, password: true },
      });
      for (const c of configs) {
        if (c.password && !isEncryptedSecret(c.password)) {
          await this.prisma.econtConfig.update({
            where: { companyId: c.companyId },
            data: { password: encryptSecret(c.password) },
          });
          this.logger.log(`Encrypted legacy Econt password for company ${c.companyId}`);
        }
      }
    } catch (err) {
      this.logger.warn(
        `Econt password self-encryption skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // ==================== ShippingProvider implementation ====================

  async testConnection(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.testConnection(creds);
  }

  async calculateShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getCredentials(companyId);
    const dbSettings = await this.getSettings(companyId);

    const settings = this.mergeSettings(dbSettings, dto);
    this.assertCodConfigured(settings, dto.codAmount);

    return this.api.calculateShipping(creds, settings, {
      orderNumber: 'CALC',
      receiverName: 'Test',
      receiverPhone: '0000000000',
      receiverOfficeCode: dto.officeCode,
      receiverAddress:
        dto.deliveryType === 'ADDRESS' && dto.addressCity
          ? {
              city: {
                country: { code3: 'BGR' },
                name: dto.addressCity,
                postCode: dto.addressPostCode || '',
              },
              street: dto.addressStreet || '',
              num: dto.addressNum || '',
            }
          : undefined,
      weight: dto.weight,
      packCount: dto.packCount,
      dimensionsL: dto.dimensionsL,
      dimensionsW: dto.dimensionsW,
      dimensionsH: dto.dimensionsH,
      codAmount: dto.codAmount,
      currency: dto.currency,
      declaredValueAmount: dto.declaredValueAmount,
    });
  }

  async createShipment(
    companyId: string,
    dto: CreateShipmentDto,
    order: any,
  ) {
    const config = await this.prisma.econtConfig.findUnique({
      where: { companyId },
    });
    if (!config || !config.username || !config.password || !config.isActive) {
      throw new BadRequestException('Econt не е конфигуриран');
    }

    const creds = this.configToCredentials(config);
    // Същите override-и като при „изчисли" — иначе цената в модала и
    // реалният етикет се разминават (кой плаща, подател, наложен платеж).
    const settings = this.mergeSettings(this.configToSettings(config), dto);
    this.assertCodConfigured(settings, dto.codAmount);

    const receiverAddress =
      dto.deliveryType === 'ADDRESS' && dto.addressCity
        ? {
            city: {
              country: { code3: 'BGR' },
              name: dto.addressCity,
              postCode: dto.addressPostCode || '',
            },
            street: dto.addressStreet || '',
            num: dto.addressNum || '',
            other: dto.addressOther,
          }
        : undefined;

    const result = await this.api.createLabel(creds, settings, {
      orderNumber: order.orderNumber,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      receiverOfficeCode: dto.officeCode,
      receiverAddress,
      weight: dto.weight,
      packCount: dto.packCount,
      dimensionsL: dto.dimensionsL,
      dimensionsW: dto.dimensionsW,
      dimensionsH: dto.dimensionsH,
      description: dto.description,
      codAmount: dto.codAmount,
      currency: dto.currency,
      declaredValueAmount: dto.declaredValueAmount,
      packingList: dto.items,
      invoiceNum: (dto as CreateShipmentDto & { invoiceNum?: string }).invoiceNum,
    });

    return this.prisma.shipment.create({
      data: {
        shipmentNumber: result.shipmentNumber,
        status: result.shipmentNumber ? 'CREATED' : 'PENDING',
        provider: PROVIDER,
        deliveryType: dto.deliveryType,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        officeCode: dto.officeCode,
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
        codAmount: dto.codAmount,
        currency: dto.currency || 'BGN',
        payer: dto.payer ?? (settings.paymentBy === 'receiver' ? 'receiver' : 'sender'),
        shippingCost: result.totalPrice,
        senderDueAmount: result.senderDueAmount,
        receiverDueAmount: result.receiverDueAmount,
        pdfUrl: result.pdfURL,
        expectedDeliveryDate: result.expectedDeliveryDate
          ? new Date(result.expectedDeliveryDate)
          : null,
        // Същата форма като след проследяване: суровият етикет + общите полета
        trackingData: JSON.parse(
          JSON.stringify({
            carrier: result.label,
            // Отговорът на createLabel не връща подателя — взимаме го от
            // настройките, с които е издаден етикетът
            origin: await this.originOf(creds, result.label, settings.senderOfficeCode),
            insurance: insuranceOf(result.label),
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

  /** Има ли фирмата активна конфигурация с потребител и парола. */
  async isConfigured(companyId: string): Promise<boolean> {
    const config = await this.prisma.econtConfig.findUnique({
      where: { companyId },
      select: { isActive: true, username: true, password: true },
    });
    return !!(config?.isActive && config.username && config.password);
  }

  /**
   * Статусите на много пратки с една заявка към Еконт (на порции по 50),
   * преведени към общия CarrierTrackingResult. Нищо не се записва тук.
   */
  async trackShipments(
    companyId: string,
    shipments: TrackableShipment[],
  ): Promise<Map<string, CarrierTrackingOutcome>> {
    const out = new Map<string, CarrierTrackingOutcome>();
    const withNumber = shipments.filter((s) => s.shipmentNumber);
    if (withNumber.length === 0) return out;
    const creds = await this.getCredentials(companyId);

    for (let i = 0; i < withNumber.length; i += 50) {
      const chunk = withNumber.slice(i, i + 50);
      const statuses = await this.api.getShipmentStatuses(
        creds,
        chunk.map((s) => s.shipmentNumber as string),
      );
      for (const s of chunk) {
        const entry = statuses.get(s.shipmentNumber as string);
        if (!entry) continue;
        if (entry.error || !entry.status) {
          out.set(s.id, { ok: false, error: entry.error || 'Еконт не върна статус' });
          continue;
        }
        out.set(s.id, {
          ok: true,
          result: {
            ...this.toTrackingResult(entry.status),
            origin: await this.originOf(creds, entry.status),
          },
        });
      }
    }
    return out;
  }

  /** Превод на ShipmentStatus на Еконт към общия формат. */
  private toTrackingResult(status: any): CarrierTrackingResult {
    const short = String(status.shortDeliveryStatus || '');
    const deliveredAt = econtTime(status.deliveryTime);
    const sentAt = econtTime(status.sendTime);
    const normalized = deliveredAt
      ? 'DELIVERED'
      : /анулиран/i.test(short)
        ? 'CANCELLED'
        : /върната|върнат/i.test(short)
          ? 'RETURNED'
          : sentAt
            ? 'IN_TRANSIT'
            : 'CREATED';

    const events = (
      Array.isArray(status.trackingEvents) ? status.trackingEvents : []
    )
      .map((ev: any) => ({
        time: econtTime(ev.time)?.toISOString() ?? null,
        description: [ev.destinationDetails, ev.officeName, ev.cityName]
          .filter((v: unknown) => typeof v === 'string' && v.trim())
          .join(', '),
      }))
      .reverse(); // най-новото първо

    const cdPaid = Number(status.cdPaidAmount) || null;
    const cdCollected = Number(status.cdCollectedAmount) || null;
    return {
      status: normalized,
      shortStatus: status.shortDeliveryStatus ?? null,
      events,
      sentAt,
      deliveredAt,
      cod:
        cdPaid || cdCollected
          ? {
              collectedAmount: cdCollected,
              collectedAt: econtTime(status.cdCollectedTime),
              paidAmount: cdPaid,
              paidAt: econtTime(status.cdPaidTime),
              currency: status.cdPaidCurrency || status.cdCollectedCurrency || null,
            }
          : null,
      origin: null, // попълва се от trackShipments (трябва кешът с офисите)
      insurance: insuranceOf(status),
      raw: status,
    };
  }

  /** Офисът на подателя по име или адресът му, ако пратката е взета от адрес. */
  private async originOf(
    creds: EcontCredentials,
    label: any,
    fallbackOfficeCode?: string | null,
  ): Promise<ShipmentOrigin | null> {
    const officeCode = label?.senderOfficeCode || fallbackOfficeCode || null;
    const addr = label?.senderAddress;
    const address = addr
      ? [addr.city?.name, [addr.street, addr.num].filter(Boolean).join(' ')]
          .filter((v) => v && String(v).trim())
          .join(', ')
      : null;
    if (!officeCode && !address) return null;
    return {
      officeCode,
      officeName: officeCode ? await this.api.officeLabel(creds, officeCode) : null,
      address: address || null,
    };
  }

  /**
   * Еконт няма „анулиране", но има изтриване на етикет докато пратката не е
   * предадена. Без него етикетът остава активен при Еконт и се таксува, ако
   * пакетът бъде предаден. Хвърля при отказ, за да НЕ се анулира локално
   * пратка, която при куриера още е жива; вече изтрит/ненамерен етикет се
   * приема за анулиран.
   */
  async cancelShipment(companyId: string, shipment: any) {
    if (!shipment.shipmentNumber) return;
    const creds = await this.getCredentials(companyId);
    try {
      await this.api.deleteLabel(creds, shipment.shipmentNumber);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Еконт: „Пратка N не е открита" (ExException) / „Не е намерена пратка"
      if (/не е открита|не е намерена|not found/i.test(msg)) {
        this.logger.warn(
          `Econt label ${shipment.shipmentNumber} already gone at Econt: ${msg}`,
        );
        return;
      }
      throw new BadRequestException(
        `${ErrorMessages.shipping.econtCancelFailed}: ${msg}`,
      );
    }
  }

  /**
   * Наложеният платеж стига до Еконт само когато е включен в настройките.
   * Етикет с НП > 0 без настройка излизаше без НП, а продажбата се
   * маркираше като платена при доставка — куриерът предава стоката без да
   * събере парите. Затова отказваме, вместо да изпускаме сумата мълчаливо.
   */
  private assertCodConfigured(settings: EcontSettings, codAmount?: number) {
    if (Number(codAmount) > 0 && !settings.codEnabled) {
      throw new BadRequestException(ErrorMessages.shipping.codNotConfigured);
    }
  }

  // ==================== Econt-specific endpoints ====================

  async getOffices(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.getOffices(creds);
  }

  async getClientProfiles(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.getClientProfiles(creds);
  }

  // ==================== Config CRUD ====================

  async getConfig(companyId: string) {
    const config = await this.prisma.econtConfig.findUnique({
      where: { companyId },
    });
    if (!config) return null;
    return { ...config, password: config.password ? '••••••••' : null };
  }

  async updateConfig(companyId: string, dto: UpdateEcontConfigDto) {
    const data = { ...dto } as any;

    if (data.password === '••••••••' || data.password === '') {
      delete data.password;
    }
    // Паролата се пази шифрована (AES-256-GCM) — plaintext само в паметта
    if (data.password) {
      data.password = encryptSecret(data.password);
    }

    const existing = await this.prisma.econtConfig.findUnique({
      where: { companyId },
    });

    let result;
    if (existing) {
      result = await this.prisma.econtConfig.update({
        where: { companyId },
        data,
      });
    } else {
      result = await this.prisma.econtConfig.create({
        data: { ...data, companyId },
      });
    }
    return { ...result, password: result.password ? '••••••••' : null };
  }

  // ==================== Helpers ====================

  /**
   * Настройките на фирмата + per-order override-и от модала. `payer` е
   * общият (Еконт/Спиди) избор „кой плаща": receiver → paymentBy=receiver;
   * sender → фирмената настройка (sender или sender_credit по договор).
   */
  private mergeSettings(
    dbSettings: EcontSettings,
    dto: Pick<
      CreateShipmentDto,
      | 'senderName'
      | 'senderPhone'
      | 'senderOfficeCode'
      | 'shipmentType'
      | 'paymentBy'
      | 'codEnabled'
      | 'declaredValueEnabled'
      | 'smsNotification'
      | 'payer'
    >,
  ): EcontSettings {
    const paymentBy =
      dto.payer === 'receiver'
        ? 'receiver'
        : dto.payer === 'sender'
          ? (dbSettings.paymentBy === 'receiver' ? 'sender' : dbSettings.paymentBy)
          : (dto.paymentBy ?? dbSettings.paymentBy);
    return {
      ...dbSettings,
      senderName: dto.senderName ?? dbSettings.senderName,
      senderPhone: dto.senderPhone ?? dbSettings.senderPhone,
      senderOfficeCode: dto.senderOfficeCode ?? dbSettings.senderOfficeCode,
      shipmentType: dto.shipmentType ?? dbSettings.shipmentType,
      paymentBy,
      codEnabled: dto.codEnabled ?? dbSettings.codEnabled,
      declaredValueEnabled: dto.declaredValueEnabled ?? dbSettings.declaredValueEnabled,
      smsNotification: dto.smsNotification ?? dbSettings.smsNotification,
    };
  }

  private async getCredentials(companyId: string): Promise<EcontCredentials> {
    const config = await this.prisma.econtConfig.findUnique({
      where: { companyId },
    });
    if (!config) {
      throw new BadRequestException('Econt не е конфигуриран');
    }
    if (!config.username) {
      throw new BadRequestException('Econt: липсва потребителско име');
    }
    if (!config.password) {
      throw new BadRequestException('Econt: липсва парола');
    }
    if (!config.isActive) {
      throw new BadRequestException('Econt интеграцията е деактивирана');
    }
    return {
      username: config.username,
      password: decryptSecretIfNeeded(config.password),
      mode: config.mode as 'test' | 'live',
    };
  }

  private async getSettings(companyId: string): Promise<EcontSettings> {
    const config = await this.prisma.econtConfig.findUnique({
      where: { companyId },
    });
    if (!config) return {};
    return this.configToSettings(config);
  }

  private configToCredentials(config: any): EcontCredentials {
    return {
      username: config.username,
      password: decryptSecretIfNeeded(config.password),
      mode: config.mode as 'test' | 'live',
    };
  }

  private configToSettings(config: any): EcontSettings {
    return {
      senderName: config.senderName,
      senderFace: config.senderFace,
      senderPhone: config.senderPhone,
      senderOfficeCode: config.senderOfficeCode,
      shipmentType: config.shipmentType,
      paymentBy: config.paymentBy,
      codEnabled: config.codEnabled,
      cdAgreementNum: config.cdAgreementNum,
      cdPayMethod: config.cdPayMethod,
      cdIban: config.cdIban,
      cdBic: config.cdBic,
      smsNotification: config.smsNotification,
      deliveryReceipt: config.deliveryReceipt,
      declaredValueEnabled: config.declaredValueEnabled,
      sizeUnder60cm: config.sizeUnder60cm,
      keepUpright: config.keepUpright,
      payAfterAccept: config.payAfterAccept,
      payAfterTest: config.payAfterTest,
      partialDelivery: config.partialDelivery,
      emailOnDelivery: config.emailOnDelivery,
      returnDaysUntilReturn: config.returnDaysUntilReturn,
      returnFailAction: config.returnFailAction,
      instructionsDefault: config.instructionsDefault,
      paymentShareAmount: config.paymentShareAmount
        ? Number(config.paymentShareAmount)
        : undefined,
      paymentSharePercent: config.paymentSharePercent,
    };
  }
}

/** Еконт дава dateTime като unix ms (понякога секунди или ISO низ). */
function econtTime(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Обявена стойност = услуга тип "OC" в services на етикета/статуса:
 * count = застрахованата сума, price = какво струва застраховката.
 */
function insuranceOf(label: any): ShipmentInsurance | null {
  const services: any[] = Array.isArray(label?.services) ? label.services : [];
  const oc = services.find((sv) => sv?.type === 'OC');
  if (!oc) return null;
  const amount = Number(oc.count);
  if (!amount || amount <= 0) return null;
  return {
    amount,
    price: oc.price != null ? Number(oc.price) : null,
    currency: oc.currency || label?.currency || null,
  };
}
