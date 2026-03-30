import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcontProvider, EcontCredentials, EcontSettings } from './econt.provider';
import { SpeedyProvider, SpeedyCredentials, SpeedySettings } from './speedy.provider';
import { UpdateShippingConfigDto } from './dto/shipping-config.dto';
import { CreateShipmentDto, CalculateShippingDto } from './dto/create-shipment.dto';

const SHIPMENT_INCLUDE = {
  order: {
    select: { id: true, orderNumber: true, customerName: true },
  },
  shippingConfig: {
    select: { id: true, provider: true },
  },
} as const;

@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,
    private econt: EcontProvider,
    private speedy: SpeedyProvider,
  ) {}

  // ==================== Config ====================

  async getConfig(companyId: string, provider: string) {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!config) return null;
    return { ...config, password: config.password ? '••••••••' : null };
  }

  async updateConfig(companyId: string, provider: string, dto: UpdateShippingConfigDto) {
    const existing = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });

    const data = { ...dto };
    if (data.password === '••••••••' || data.password === '') {
      delete data.password;
    }
    delete data.provider; // Don't allow changing provider via this endpoint

    if (existing) {
      const updated = await this.prisma.shippingConfig.update({
        where: { id: existing.id },
        data,
      });
      return { ...updated, password: updated.password ? '••••••••' : null };
    }

    const created = await this.prisma.shippingConfig.create({
      data: {
        ...data,
        provider,
        companyId,
      },
    });
    return { ...created, password: created.password ? '••••••••' : null };
  }

  async testConnection(companyId: string, provider: string) {
    if (provider === 'speedy') {
      const creds = await this.getSpeedyCredentials(companyId);
      return this.speedy.testConnection(creds);
    }
    const creds = await this.getEcontCredentials(companyId);
    return this.econt.testConnection(creds);
  }

  // ==================== Econt-specific ====================

  async getEcontOffices(companyId: string) {
    const creds = await this.getEcontCredentials(companyId);
    return this.econt.getOffices(creds);
  }

  async getEcontClientProfiles(companyId: string) {
    const creds = await this.getEcontCredentials(companyId);
    return this.econt.getClientProfiles(creds);
  }

  // ==================== Speedy-specific ====================

  async getSpeedyOffices(companyId: string, siteId?: number, name?: string) {
    const creds = await this.getSpeedyCredentials(companyId);
    return this.speedy.findOffices(creds, { siteId, name });
  }

  async getSpeedySites(companyId: string, name?: string, postCode?: string) {
    const creds = await this.getSpeedyCredentials(companyId);
    return this.speedy.findSites(creds, { name, postCode });
  }

  async getSpeedyServices(companyId: string) {
    const creds = await this.getSpeedyCredentials(companyId);
    return this.speedy.getServices(creds);
  }

  async getSpeedyClientInfo(companyId: string) {
    const creds = await this.getSpeedyCredentials(companyId);
    return this.speedy.getClientInfo(creds);
  }

  // ==================== Shipments ====================

  async calculateShipping(companyId: string, provider: string, dto: CalculateShippingDto) {
    if (provider === 'speedy') {
      return this.calculateSpeedyShipping(companyId, dto);
    }
    return this.calculateEcontShipping(companyId, dto);
  }

  private async calculateEcontShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getEcontCredentials(companyId);
    const settings = await this.getEcontSettings(companyId);

    return this.econt.calculateShipping(creds, settings, {
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
    });
  }

  private async calculateSpeedyShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getSpeedyCredentials(companyId);
    const settings = await this.getSpeedySettings(companyId);

    return this.speedy.calculateShipping(creds, settings, {
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

  async createShipment(companyId: string, dto: CreateShipmentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundException('Поръчката не е намерена');
    }

    const provider = dto.provider || 'econt';

    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!config || !config.isActive) {
      throw new BadRequestException(
        provider === 'speedy' ? 'Speedy не е конфигуриран' : 'Econt не е конфигуриран',
      );
    }

    if (provider === 'speedy') {
      return this.createSpeedyShipment(companyId, dto, order, config);
    }
    return this.createEcontShipment(companyId, dto, order, config);
  }

  private async createEcontShipment(
    companyId: string,
    dto: CreateShipmentDto,
    order: any,
    config: any,
  ) {
    const creds = this.configToEcontCredentials(config);
    const settings = this.configToEcontSettings(config);

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

    const result = await this.econt.createLabel(creds, settings, {
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
    });

    return this.prisma.shipment.create({
      data: {
        shipmentNumber: result.shipmentNumber,
        status: result.shipmentNumber ? 'CREATED' : 'PENDING',
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
        shippingCost: result.totalPrice,
        senderDueAmount: result.senderDueAmount,
        receiverDueAmount: result.receiverDueAmount,
        pdfUrl: result.pdfURL,
        expectedDeliveryDate: result.expectedDeliveryDate
          ? new Date(result.expectedDeliveryDate)
          : null,
        trackingData: result.label,
        orderId: dto.orderId,
        shippingConfigId: config.id,
        companyId,
      },
      include: SHIPMENT_INCLUDE,
    });
  }

  private async createSpeedyShipment(
    companyId: string,
    dto: CreateShipmentDto,
    order: any,
    config: any,
  ) {
    const creds = this.configToSpeedyCredentials(config);
    const settings = this.configToSpeedySettings(config);

    const result = await this.speedy.createShipment(creds, settings, {
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
        shippingCost: result.price?.totalPrice,
        pdfUrl: null, // Will be fetched separately via print endpoint
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
        shippingConfigId: config.id,
        companyId,
      },
      include: SHIPMENT_INCLUDE,
    });
  }

  async getOrderShipments(companyId: string, orderId: string) {
    return this.prisma.shipment.findMany({
      where: { companyId, orderId },
      include: SHIPMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async trackShipment(companyId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
      include: { shippingConfig: { select: { provider: true } } },
    });
    if (!shipment) {
      throw new NotFoundException('Пратката не е намерена');
    }
    if (!shipment.shipmentNumber) {
      throw new BadRequestException('Пратката няма номер за проследяване');
    }

    const provider = shipment.shippingConfig?.provider || 'econt';

    if (provider === 'speedy') {
      const creds = await this.getSpeedyCredentials(companyId);
      // Use parcel barcode for tracking if available
      const trackingInfo = shipment.trackingData as any;
      const parcelBarcode = trackingInfo?.parcelBarcode || trackingInfo?.parcels?.[0]?.barcode;
      if (!parcelBarcode) {
        throw new BadRequestException('Няма баркод за проследяване');
      }
      const parcels = await this.speedy.trackParcels(creds, [parcelBarcode]);
      const status = parcels?.[0] || null;
      if (status) {
        await this.prisma.shipment.update({
          where: { id: shipmentId },
          data: { trackingData: { ...trackingInfo, tracking: status } },
        });
      }
      return status;
    }

    // Econt
    const creds = await this.getEcontCredentials(companyId);
    const status = await this.econt.trackShipment(creds, shipment.shipmentNumber);
    if (status) {
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: { trackingData: status },
      });
    }
    return status;
  }

  async cancelShipment(companyId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
      include: { shippingConfig: { select: { provider: true } } },
    });
    if (!shipment) {
      throw new NotFoundException('Пратката не е намерена');
    }
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      throw new BadRequestException(
        'Не може да се анулира доставена или вече анулирана пратка',
      );
    }

    // Try to cancel in provider API
    const provider = shipment.shippingConfig?.provider || 'econt';
    if (provider === 'speedy' && shipment.shipmentNumber) {
      try {
        const creds = await this.getSpeedyCredentials(companyId);
        await this.speedy.cancelShipment(creds, shipment.shipmentNumber);
      } catch {
        // Cancel locally even if API call fails
      }
    }

    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'CANCELLED' },
      include: SHIPMENT_INCLUDE,
    });
  }

  async getSpeedyLabel(companyId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, companyId },
      include: { shippingConfig: { select: { provider: true } } },
    });
    if (!shipment || shipment.shippingConfig?.provider !== 'speedy') {
      throw new NotFoundException('Speedy пратка не е намерена');
    }

    const trackingInfo = shipment.trackingData as any;
    const parcelId = trackingInfo?.parcels?.[0]?.id;
    if (!parcelId || !shipment.shipmentNumber) {
      throw new BadRequestException('Няма данни за печат');
    }

    const creds = await this.getSpeedyCredentials(companyId);
    return this.speedy.printLabels(creds, shipment.shipmentNumber, parcelId);
  }

  // ==================== Econt Helpers ====================

  private async getEcontCredentials(companyId: string): Promise<EcontCredentials> {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });
    if (!config || !config.username || !config.password || !config.isActive) {
      throw new BadRequestException('Econt не е конфигуриран');
    }
    return {
      username: config.username,
      password: config.password,
      mode: config.mode as 'test' | 'live',
    };
  }

  private async getEcontSettings(companyId: string): Promise<EcontSettings> {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });
    if (!config) return {};
    return this.configToEcontSettings(config);
  }

  private configToEcontCredentials(config: any): EcontCredentials {
    return {
      username: config.username,
      password: config.password,
      mode: config.mode as 'test' | 'live',
    };
  }

  private configToEcontSettings(config: any): EcontSettings {
    return {
      senderName: config.senderName,
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

  // ==================== Speedy Helpers ====================

  private async getSpeedyCredentials(companyId: string): Promise<SpeedyCredentials> {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'speedy' } },
    });
    if (!config || !config.username || !config.password || !config.isActive) {
      throw new BadRequestException('Speedy не е конфигуриран');
    }
    return {
      username: config.username,
      password: config.password,
    };
  }

  private async getSpeedySettings(companyId: string): Promise<SpeedySettings> {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'speedy' } },
    });
    if (!config) return {};
    return this.configToSpeedySettings(config);
  }

  private configToSpeedyCredentials(config: any): SpeedyCredentials {
    return {
      username: config.username,
      password: config.password,
    };
  }

  private configToSpeedySettings(config: any): SpeedySettings {
    return {
      senderClientId: config.speedySenderClientId,
      senderPhone: config.senderPhone,
      senderName: config.senderName,
      senderSiteId: config.speedySenderSiteId,
      senderOfficeId: config.speedySenderOfficeId,
      serviceId: config.speedyServiceId,
      payerType: config.speedyPayerType || 'SENDER',
      codEnabled: config.codEnabled,
      codProcessingType: config.speedyCodProcessingType || 'CASH',
      declaredValueEnabled: config.declaredValueEnabled,
      saturdayDelivery: config.speedySaturdayDelivery,
      deferredDays: config.speedyDeferredDays,
    };
  }
}
