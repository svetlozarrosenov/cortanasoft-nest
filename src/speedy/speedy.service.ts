import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SpeedyApiClient,
  SpeedyCredentials,
  SpeedySettings,
} from './speedy-api.client';
import { ShippingProvider } from '../shipping/shipping-provider.interface';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from '../shipping/dto/create-shipment.dto';

const PROVIDER = 'speedy';

@Injectable()
export class SpeedyService implements ShippingProvider {
  readonly name = PROVIDER;

  constructor(
    private prisma: PrismaService,
    private api: SpeedyApiClient,
  ) {}

  // ==================== ShippingProvider implementation ====================

  async testConnection(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.testConnection(creds);
  }

  async calculateShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getCredentials(companyId);
    const settings = await this.getSettings(companyId);

    return this.api.calculateShipping(creds, settings, {
      orderNumber: 'CALC',
      receiverName: 'Test',
      receiverPhone: '0000000000',
      receiverOfficeId: dto.speedyOfficeId,
      receiverSiteId: dto.speedySiteId,
      receiverAddress:
        dto.deliveryType === 'ADDRESS' && dto.speedySiteId
          ? {
              countryId: 100,
              siteId: dto.speedySiteId,
              streetName: dto.addressStreet || '',
              streetNumber: dto.addressNum,
              postCode: dto.addressPostCode,
            }
          : undefined,
      parcelsCount: dto.packCount || 1,
      weight: dto.weight,
      width: dto.dimensionsW,
      height: dto.dimensionsH,
      depth: dto.dimensionsL,
      codAmount: dto.codAmount,
      currency: dto.currency,
    });
  }

  async createShipment(
    companyId: string,
    dto: CreateShipmentDto,
    order: any,
  ) {
    const config = await this.prisma.speedyConfig.findUnique({
      where: { companyId },
    });
    if (!config || !config.username || !config.password || !config.isActive) {
      throw new BadRequestException('Speedy не е конфигуриран');
    }

    const creds = this.configToCredentials(config);
    const settings = this.configToSettings(config);

    const result = await this.api.createShipment(creds, settings, {
      orderNumber: order.orderNumber,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      receiverOfficeId: dto.speedyOfficeId,
      receiverSiteId: dto.speedySiteId,
      receiverAddress:
        dto.deliveryType === 'ADDRESS' && dto.speedySiteId
          ? {
              countryId: 100,
              siteId: dto.speedySiteId,
              streetName: dto.addressStreet || '',
              streetNumber: dto.addressNum,
              postCode: dto.addressPostCode,
            }
          : undefined,
      parcelsCount: dto.packCount || 1,
      weight: dto.weight,
      width: dto.dimensionsW,
      height: dto.dimensionsH,
      depth: dto.dimensionsL,
      description: dto.description,
      codAmount: dto.codAmount,
      currency: dto.currency,
    });

    const parcelBarcode = result.parcels?.[0]?.barcode || null;

    return this.prisma.shipment.create({
      data: {
        shipmentNumber: result.shipmentId,
        status: result.shipmentId ? 'CREATED' : 'PENDING',
        provider: PROVIDER,
        deliveryType: dto.deliveryType,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        officeCode: dto.speedyOfficeId?.toString(),
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
        shippingCost: result.price?.total,
        pdfUrl: null,
        expectedDeliveryDate: result.deliveryDeadline
          ? new Date(result.deliveryDeadline)
          : null,
        trackingData: {
          shipmentId: result.shipmentId,
          parcels: result.parcels,
          parcelBarcode,
          price: result.price,
          pickupDate: result.pickupDate,
        },
        orderId: dto.orderId,
        companyId,
      },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true } },
      },
    });
  }

  async trackShipment(companyId: string, shipment: any) {
    const trackingInfo = shipment.trackingData as any;
    const parcelBarcode =
      trackingInfo?.parcelBarcode || trackingInfo?.parcels?.[0]?.barcode;
    if (!parcelBarcode) {
      throw new BadRequestException('Няма баркод за проследяване');
    }

    const creds = await this.getCredentials(companyId);
    const parcels = await this.api.trackParcels(creds, [parcelBarcode]);
    const status = parcels?.[0] || null;

    if (status) {
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { trackingData: { ...trackingInfo, tracking: status } },
      });
    }
    return status;
  }

  async cancelShipment(companyId: string, shipment: any) {
    if (!shipment.shipmentNumber) return;
    try {
      const creds = await this.getCredentials(companyId);
      await this.api.cancelShipment(creds, shipment.shipmentNumber);
    } catch {
      // Best-effort
    }
  }

  // ==================== Speedy-specific endpoints ====================

  async getOffices(companyId: string, siteId?: number, name?: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.findOffices(creds, { siteId, name });
  }

  async getSites(companyId: string, name?: string, postCode?: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.findSites(creds, { name, postCode });
  }

  async getSiteById(companyId: string, siteId: number) {
    const creds = await this.getCredentials(companyId);
    return this.api.getSiteById(creds, siteId);
  }

  async getOfficeById(companyId: string, officeId: number) {
    const creds = await this.getCredentials(companyId);
    return this.api.getOfficeById(creds, officeId);
  }

  async getCountries(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.getAllCountries(creds);
  }

  async getServices(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.getServices(creds);
  }

  async getClientInfo(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.getClientInfo(creds);
  }

  async getLabel(companyId: string, shipment: any) {
    const trackingInfo = shipment.trackingData as any;
    const parcelId = trackingInfo?.parcels?.[0]?.id;
    if (!parcelId || !shipment.shipmentNumber) {
      throw new BadRequestException('Няма данни за печат');
    }
    const creds = await this.getCredentials(companyId);
    return this.api.printLabels(creds, shipment.shipmentNumber, parcelId);
  }

  // ==================== Config CRUD ====================

  async getConfig(companyId: string) {
    const config = await this.prisma.speedyConfig.findUnique({
      where: { companyId },
    });
    if (!config) return null;
    return this.toResponseShape(config);
  }

  async updateConfig(companyId: string, dto: any) {
    // Map от стария "speedy*"-prefixed namespace към новите имена в SpeedyConfig модела
    const data: any = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.password !== undefined && dto.password !== '••••••••' && dto.password !== '') {
      data.password = dto.password;
    }
    if (dto.senderName !== undefined) data.senderName = dto.senderName;
    if (dto.senderPhone !== undefined) data.senderPhone = dto.senderPhone;

    // Speedy-specific (mapping старите prefixed имена към новата схема)
    // BigInt полетата изискват конверсия от number → bigint за Prisma
    const toBigInt = (v: any) =>
      v === null || v === undefined ? null : BigInt(v);
    if (dto.speedySenderClientId !== undefined)
      data.senderClientId = toBigInt(dto.speedySenderClientId);
    if (dto.speedySenderSiteId !== undefined)
      data.senderSiteId = toBigInt(dto.speedySenderSiteId);
    if (dto.speedySenderOfficeId !== undefined)
      data.senderOfficeId = toBigInt(dto.speedySenderOfficeId);
    if (dto.speedyServiceId !== undefined) data.serviceId = dto.speedyServiceId;
    if (dto.speedyCodProcessingType !== undefined) data.codProcessingType = dto.speedyCodProcessingType;
    if (dto.speedySaturdayDelivery !== undefined) data.saturdayDelivery = dto.speedySaturdayDelivery;
    if (dto.speedyDeferredDays !== undefined) data.deferredDays = dto.speedyDeferredDays;
    if (dto.speedyPayerType !== undefined) data.payerType = dto.speedyPayerType;
    if (dto.codEnabled !== undefined) data.codEnabled = dto.codEnabled;
    if (dto.declaredValueEnabled !== undefined) data.declaredValueEnabled = dto.declaredValueEnabled;

    // Country (нов)
    if (dto.senderCountryId !== undefined) data.senderCountryId = dto.senderCountryId;

    const existing = await this.prisma.speedyConfig.findUnique({
      where: { companyId },
    });

    let result;
    if (existing) {
      result = await this.prisma.speedyConfig.update({
        where: { companyId },
        data,
      });
    } else {
      result = await this.prisma.speedyConfig.create({
        data: { ...data, companyId },
      });
    }
    return this.toResponseShape(result);
  }

  /**
   * Mapping от DB модела (без префикс) обратно към "speedy*"-prefixed схема,
   * която frontend-ът очаква. BigInt полетата се конвертират към number за JSON.
   */
  private toResponseShape(config: any) {
    const bigIntToNumber = (v: bigint | null | undefined) =>
      v === null || v === undefined ? null : Number(v);

    return {
      id: config.id,
      isActive: config.isActive,
      username: config.username,
      password: config.password ? '••••••••' : null,
      senderName: config.senderName,
      senderPhone: config.senderPhone,
      senderCountryId: config.senderCountryId,
      speedySenderClientId: bigIntToNumber(config.senderClientId),
      speedySenderSiteId: bigIntToNumber(config.senderSiteId),
      speedySenderOfficeId: bigIntToNumber(config.senderOfficeId),
      speedyServiceId: config.serviceId,
      speedyCodProcessingType: config.codProcessingType,
      speedySaturdayDelivery: config.saturdayDelivery,
      speedyDeferredDays: config.deferredDays,
      speedyPayerType: config.payerType,
      codEnabled: config.codEnabled,
      declaredValueEnabled: config.declaredValueEnabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      companyId: config.companyId,
    };
  }

  // ==================== Helpers ====================

  private async getCredentials(companyId: string): Promise<SpeedyCredentials> {
    const config = await this.prisma.speedyConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      throw new BadRequestException(
        'Speedy не е конфигуриран. Моля, запишете настройки първо.',
      );
    }
    if (!config.username) {
      throw new BadRequestException('Speedy: липсва потребителско име');
    }
    if (!config.password) {
      throw new BadRequestException('Speedy: липсва парола');
    }
    if (!config.isActive) {
      throw new BadRequestException('Speedy интеграцията е деактивирана');
    }

    return {
      username: config.username,
      password: config.password,
    };
  }

  private async getSettings(companyId: string): Promise<SpeedySettings> {
    const config = await this.prisma.speedyConfig.findUnique({
      where: { companyId },
    });
    if (!config) return {};
    return this.configToSettings(config);
  }

  private configToCredentials(config: any): SpeedyCredentials {
    return {
      username: config.username,
      password: config.password,
    };
  }

  private configToSettings(config: any): SpeedySettings {
    const toNum = (v: any) =>
      v === null || v === undefined ? undefined : Number(v);
    return {
      senderClientId: toNum(config.senderClientId),
      senderPhone: config.senderPhone ?? undefined,
      senderName: config.senderName ?? undefined,
      senderSiteId: toNum(config.senderSiteId),
      senderOfficeId: toNum(config.senderOfficeId),
      serviceId: config.serviceId ?? undefined,
      payerType: config.payerType || 'SENDER',
      codEnabled: config.codEnabled,
      codProcessingType: config.codProcessingType || 'CASH',
      declaredValueEnabled: config.declaredValueEnabled,
      saturdayDelivery: config.saturdayDelivery,
      deferredDays: config.deferredDays ?? undefined,
    };
  }
}
