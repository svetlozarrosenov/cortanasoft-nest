import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcontProvider, EcontCredentials, EcontSettings } from './econt.provider';
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
  ) {}

  // ==================== Config ====================

  async getConfig(companyId: string) {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });
    if (!config) return null;
    // Never expose password to client
    return { ...config, password: config.password ? '••••••••' : null };
  }

  async updateConfig(companyId: string, dto: UpdateShippingConfigDto) {
    const existing = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });

    // Don't overwrite password if masked value is sent
    const data = { ...dto };
    if (data.password === '••••••••' || data.password === '') {
      delete data.password;
    }

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
        provider: 'econt',
        companyId,
      },
    });
    return { ...created, password: created.password ? '••••••••' : null };
  }

  async testConnection(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.econt.testConnection(creds);
  }

  async getOffices(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.econt.getOffices(creds);
  }

  async getClientProfiles(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.econt.getClientProfiles(creds);
  }

  // ==================== Shipments ====================

  async calculateShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getCredentials(companyId);
    const settings = await this.getSettings(companyId);

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

  async createShipment(companyId: string, dto: CreateShipmentDto) {
    // Verify order exists
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundException('Поръчката не е намерена');
    }

    // Get config
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });
    if (!config || !config.isActive) {
      throw new BadRequestException('Econt не е конфигуриран');
    }

    const creds = this.configToCredentials(config);
    const settings = this.configToSettings(config);

    // Build receiver address for Econt
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

    // Create label via Econt API
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

    // Save shipment
    const shipment = await this.prisma.shipment.create({
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

    return shipment;
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
    });
    if (!shipment) {
      throw new NotFoundException('Пратката не е намерена');
    }
    if (!shipment.shipmentNumber) {
      throw new BadRequestException('Пратката няма номер за проследяване');
    }

    const creds = await this.getCredentials(companyId);
    const status = await this.econt.trackShipment(
      creds,
      shipment.shipmentNumber,
    );

    // Update tracking data
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
    });
    if (!shipment) {
      throw new NotFoundException('Пратката не е намерена');
    }
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      throw new BadRequestException(
        'Не може да се анулира доставена или вече анулирана пратка',
      );
    }

    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status: 'CANCELLED' },
      include: SHIPMENT_INCLUDE,
    });
  }

  // ==================== Helpers ====================

  private async getCredentials(companyId: string): Promise<EcontCredentials> {
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

  private async getSettings(companyId: string): Promise<EcontSettings> {
    const config = await this.prisma.shippingConfig.findUnique({
      where: { companyId_provider: { companyId, provider: 'econt' } },
    });
    if (!config) return {};
    return this.configToSettings(config);
  }

  private configToCredentials(config: any): EcontCredentials {
    return {
      username: config.username,
      password: config.password,
      mode: config.mode as 'test' | 'live',
    };
  }

  private configToSettings(config: any): EcontSettings {
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
}
