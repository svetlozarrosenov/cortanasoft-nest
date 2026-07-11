import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  UpsertPriceListItemDto,
} from './dto';

const PRICE_LIST_INCLUDE = {
  items: {
    include: {
      product: {
        select: { id: true, sku: true, name: true, unit: true, salePrice: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  customers: {
    select: {
      id: true,
      type: true,
      companyName: true,
      firstName: true,
      lastName: true,
      eik: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  _count: { select: { items: true, customers: true } },
};

@Injectable()
export class PriceListsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.priceList.findMany({
      where: { companyId },
      include: { _count: { select: { items: true, customers: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const priceList = await this.prisma.priceList.findFirst({
      where: { id, companyId },
      include: PRICE_LIST_INCLUDE,
    });
    if (!priceList) {
      throw new NotFoundException('Ценовата листа не е намерена');
    }
    return priceList;
  }

  async create(companyId: string, dto: CreatePriceListDto) {
    const existing = await this.prisma.priceList.findFirst({
      where: { companyId, name: dto.name },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Ценова листа с това име вече съществува');
    }
    return this.prisma.priceList.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
        companyId,
      },
      include: PRICE_LIST_INCLUDE,
    });
  }

  async update(companyId: string, id: string, dto: UpdatePriceListDto) {
    await this.findOne(companyId, id);
    if (dto.name) {
      const clash = await this.prisma.priceList.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
        select: { id: true },
      });
      if (clash) {
        throw new BadRequestException('Ценова листа с това име вече съществува');
      }
    }
    return this.prisma.priceList.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: PRICE_LIST_INCLUDE,
    });
  }

  // Изтриването е безопасно: клиентите се отвързват (SetNull), продажбите не
  // зависят от листата — цените по редовете са копирани в момента на продажба.
  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.priceList.delete({ where: { id } });
    return { message: 'Ценовата листа е изтрита успешно' };
  }

  // Задава/обновява цена на продукт в листата (upsert по [listId, productId])
  async upsertItem(companyId: string, id: string, dto: UpsertPriceListItemDto) {
    await this.findOne(companyId, id);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Продуктът не е намерен');
    }

    await this.prisma.priceListItem.upsert({
      where: {
        priceListId_productId: { priceListId: id, productId: dto.productId },
      },
      create: { priceListId: id, productId: dto.productId, price: dto.price },
      update: { price: dto.price },
    });

    return this.findOne(companyId, id);
  }

  async removeItem(companyId: string, id: string, itemId: string) {
    await this.findOne(companyId, id);
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId: id },
      select: { id: true },
    });
    if (!item) {
      throw new NotFoundException('Редът от ценовата листа не е намерен');
    }
    await this.prisma.priceListItem.delete({ where: { id: itemId } });
    return this.findOne(companyId, id);
  }

  // Закача клиент към листата. Клиент може да е в максимум една листа —
  // повторно закачане просто го премества (както в Odoo/BC).
  async assignCustomer(companyId: string, id: string, customerId: string) {
    await this.findOne(companyId, id);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Клиентът не е намерен');
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { priceListId: id },
    });
    return this.findOne(companyId, id);
  }

  async unassignCustomer(companyId: string, id: string, customerId: string) {
    await this.findOne(companyId, id);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId, priceListId: id },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Клиентът не е в тази ценова листа');
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { priceListId: null },
    });
    return this.findOne(companyId, id);
  }

  // Ефективни цени за клиент: редовете от неговата активна листа.
  // Продажбите ги ползват като дефолтна единична цена; продукти извън листата
  // падат към Product.salePrice (решава се във frontend-а, който има продукта).
  async getEffectivePrices(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: {
        id: true,
        priceList: {
          select: {
            id: true,
            name: true,
            isActive: true,
            items: { select: { productId: true, price: true } },
          },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException('Клиентът не е намерен');
    }

    if (!customer.priceList || !customer.priceList.isActive) {
      return { priceListId: null, priceListName: null, prices: [] };
    }

    return {
      priceListId: customer.priceList.id,
      priceListName: customer.priceList.name,
      prices: customer.priceList.items.map((i) => ({
        productId: i.productId,
        price: Number(i.price),
      })),
    };
  }
}
