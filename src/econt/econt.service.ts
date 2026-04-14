import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcontApiService } from './econt-api.service';
import { EcontCredentials, EcontSettings } from './interfaces';
import { ShippingProvider } from '../shipping/interfaces';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from '../shipping/dto/create-shipment.dto';
import { UpdateEcontConfigDto } from './dto/update-econt-config.dto';

const PROVIDER = 'econt';

@Injectable()
export class EcontService implements ShippingProvider {
  readonly name = PROVIDER;

  constructor(
    private prisma: PrismaService,
    private api: EcontApiService,
  ) {}

  // ==================== ShippingProvider implementation ====================

  async testConnection(companyId: string) {
    const creds = await this.getCredentials(companyId);
    return this.api.testConnection(creds);
  }

  async calculateShipping(companyId: string, dto: CalculateShippingDto) {
    const creds = await this.getCredentials(companyId);
    const dbSettings = await this.getSettings(companyId);

    // Frontend подава override-и per-order; fallback от DB config
    const settings: EcontSettings = {
      ...dbSettings,
      senderName: dto.senderName ?? dbSettings.senderName,
      senderPhone: dto.senderPhone ?? dbSettings.senderPhone,
      senderOfficeCode: dto.senderOfficeCode ?? dbSettings.senderOfficeCode,
      shipmentType: dto.shipmentType ?? dbSettings.shipmentType,
      paymentBy: dto.paymentBy ?? dbSettings.paymentBy,
      codEnabled: dto.codEnabled ?? dbSettings.codEnabled,
      declaredValueEnabled: dto.declaredValueEnabled ?? dbSettings.declaredValueEnabled,
    };

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
    const settings = this.configToSettings(config);

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
        shippingCost: result.totalPrice,
        senderDueAmount: result.senderDueAmount,
        receiverDueAmount: result.receiverDueAmount,
        pdfUrl: result.pdfURL,
        expectedDeliveryDate: result.expectedDeliveryDate
          ? new Date(result.expectedDeliveryDate)
          : null,
        trackingData: result.label,
        orderId: dto.orderId,
        companyId,
      },
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true } },
      },
    });
  }

  async trackShipment(companyId: string, shipment: any) {
    if (!shipment.shipmentNumber) {
      throw new BadRequestException('Пратката няма номер за проследяване');
    }
    const creds = await this.getCredentials(companyId);
    const status = await this.api.trackShipment(creds, shipment.shipmentNumber);
    if (status) {
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: { trackingData: status },
      });
    }
    return status;
  }

  async cancelShipment(_companyId: string, _shipment: any) {
    // Econt API не предлага cancel endpoint — анулираме само локално в shipping.service
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
      password: config.password,
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
