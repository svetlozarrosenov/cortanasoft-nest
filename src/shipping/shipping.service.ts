import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EcontService } from '../econt/econt.service';
import { SpeedyService } from '../speedy/speedy.service';
import { ShippingProvider } from './interfaces';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from './dto/create-shipment.dto';

const SHIPMENT_INCLUDE = {
  order: {
    select: { id: true, orderNumber: true, customerName: true },
  },
} as const;

/**
 * Orchestrator service. Не знае нищо за конкретните carrier API-та —
 * делегира към registered ShippingProvider имплементациите.
 *
 * За добавяне на нов carrier (напр. DHL):
 *   1. Създай DhlModule + DhlService implements ShippingProvider
 *   2. Импортирай DhlModule в ShippingModule
 *   3. Инжектирай в конструктора и добави в this.providers Map
 *   4. Създай DhlConfig модел в Prisma schema
 */
@Injectable()
export class ShippingService {
  private readonly providers = new Map<string, ShippingProvider>();

  constructor(
    private prisma: PrismaService,
    private econtService: EcontService,
    private speedyService: SpeedyService,
  ) {
    this.providers.set(econtService.name, econtService);
    this.providers.set(speedyService.name, speedyService);
  }

  private getProvider(name: string): ShippingProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`Неподдържан превозвач: ${name}`);
    }
    return provider;
  }

  // ==================== Делегиране към providers ====================

  async testConnection(companyId: string, provider: string) {
    return this.getProvider(provider).testConnection(companyId);
  }

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

    return this.getProvider(dto.provider).createShipment(companyId, dto, order);
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
    return this.getProvider(shipment.provider).trackShipment(
      companyId,
      shipment,
    );
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
