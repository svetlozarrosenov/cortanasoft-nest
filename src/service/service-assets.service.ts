import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { ServiceNumberingService } from './service-numbering.service';
import {
  CreateServiceAssetDto,
  UpdateServiceAssetDto,
  QueryServiceAssetsDto,
} from './dto';

const ASSET_INCLUDE = {
  customer: true,
  product: true,
  warranty: true,
  _count: { select: { serviceOrders: true } },
} as const;

@Injectable()
export class ServiceAssetsService {
  constructor(
    private prisma: PrismaService,
    private numbering: ServiceNumberingService,
  ) {}

  async create(companyId: string, dto: CreateServiceAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.customers.notFound);
      }

      const assetNumber =
        dto.assetNumber || (await this.numbering.next('asset', companyId, tx));

      return tx.serviceAsset.create({
        data: {
          companyId,
          assetNumber,
          name: dto.name,
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          imei: dto.imei,
          vin: dto.vin,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
          notes: dto.notes,
          status: dto.status || 'ACTIVE',
          customerId: dto.customerId,
          productId: dto.productId,
          warrantyId: dto.warrantyId,
        },
        include: ASSET_INCLUDE,
      });
    });
  }

  async findAll(companyId: string, query: QueryServiceAssetsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.ServiceAssetWhereInput = { companyId };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { assetNumber: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { imei: { contains: s, mode: 'insensitive' } },
        { vin: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.serviceAsset.findMany({
        where,
        include: ASSET_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceAsset.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const asset = await this.prisma.serviceAsset.findFirst({
      where: { id, companyId },
      include: {
        ...ASSET_INCLUDE,
        serviceOrders: {
          orderBy: { receivedAt: 'desc' },
          take: 50,
          include: {
            technician: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException('Активът не е намерен');
    }
    return asset;
  }

  async update(companyId: string, id: string, dto: UpdateServiceAssetDto) {
    await this.findOne(companyId, id);
    return this.prisma.serviceAsset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
      include: ASSET_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.serviceAsset.delete({ where: { id } });
  }

  async lookupBySerial(companyId: string, serial: string) {
    const trimmed = (serial || '').trim();
    if (!trimmed) {
      return { existingAssets: [], soldSerials: [] };
    }

    const existingAssets = await this.prisma.serviceAsset.findMany({
      where: {
        companyId,
        OR: [
          { serialNumber: trimmed },
          { imei: trimmed },
          { vin: trimmed },
        ],
      },
      include: {
        ...ASSET_INCLUDE,
        warranty: true,
        serviceOrders: {
          orderBy: { receivedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            receivedAt: true,
            completedAt: true,
            customerComplaint: true,
          },
        },
      },
    });

    const inventorySerials = await this.prisma.inventorySerial.findMany({
      where: {
        companyId,
        serialNumber: trimmed,
        status: 'SOLD',
      },
      include: {
        product: true,
        location: { select: { id: true, name: true } },
      },
    });

    const soldSerials = await Promise.all(
      inventorySerials.map(async (serialRow) => {
        const orderItem = await this.prisma.orderItem.findFirst({
          where: {
            inventorySerialId: serialRow.id,
            order: {
              companyId,
              status: { notIn: ['DRAFT', 'CANCELLED'] },
            },
          },
          orderBy: { order: { orderDate: 'desc' } },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderDate: true,
                status: true,
                customerId: true,
                customerName: true,
                customerEmail: true,
                customerPhone: true,
                customer: true,
              },
            },
          },
        });

        if (!orderItem || !orderItem.order) return null;

        const activeWarranty = await this.prisma.issuedWarranty.findFirst({
          where: {
            companyId,
            serialNumber: trimmed,
            productId: serialRow.productId,
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
          orderBy: { endDate: 'desc' },
          include: { warrantyTemplate: true },
        });

        return {
          inventorySerial: serialRow,
          orderItem: {
            id: orderItem.id,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice,
          },
          order: orderItem.order,
          activeWarranty,
        };
      }),
    );

    return {
      existingAssets,
      soldSerials: soldSerials.filter((s) => s !== null),
    };
  }

  async createFromSale(
    companyId: string,
    dto: { inventorySerialId: string; customerId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const serial = await tx.inventorySerial.findFirst({
        where: { id: dto.inventorySerialId, companyId },
        include: { product: true },
      });
      if (!serial) {
        throw new NotFoundException('Серийният номер не е намерен');
      }

      const orderItem = await tx.orderItem.findFirst({
        where: {
          inventorySerialId: serial.id,
          order: {
            companyId,
            status: { notIn: ['DRAFT', 'CANCELLED'] },
          },
        },
        orderBy: { order: { orderDate: 'desc' } },
        include: { order: true },
      });

      const resolvedCustomerId = dto.customerId || orderItem?.order.customerId;
      if (!resolvedCustomerId) {
        throw new NotFoundException(
          'Не може да се определи клиент за този артикул',
        );
      }

      const customer = await tx.customer.findFirst({
        where: { id: resolvedCustomerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.customers.notFound);
      }

      const existing = await tx.serviceAsset.findFirst({
        where: {
          companyId,
          serialNumber: serial.serialNumber,
          customerId: resolvedCustomerId,
        },
      });
      if (existing) {
        return tx.serviceAsset.findUnique({
          where: { id: existing.id },
          include: ASSET_INCLUDE,
        });
      }

      const warranty = await tx.issuedWarranty.findFirst({
        where: {
          companyId,
          serialNumber: serial.serialNumber,
          productId: serial.productId,
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
        orderBy: { endDate: 'desc' },
      });

      const assetNumber = await this.numbering.next('asset', companyId, tx);

      return tx.serviceAsset.create({
        data: {
          companyId,
          assetNumber,
          name: serial.product.name,
          serialNumber: serial.serialNumber,
          purchaseDate: orderItem?.order.orderDate || null,
          status: 'ACTIVE',
          customerId: resolvedCustomerId,
          productId: serial.productId,
          warrantyId: warranty?.id,
        },
        include: ASSET_INCLUDE,
      });
    });
  }
}
