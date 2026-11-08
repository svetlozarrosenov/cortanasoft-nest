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

  /**
   * Избор на артикул за сервизна заявка: един списък по страници, първо
   * заведените артикули (на клиента или на всички), после продадени серийни
   * номера, които още не са заведени — те се завеждат при избор. Търсенето
   * е от първия знак по име / номер / сериен / IMEI / VIN / продукт.
   */
  async pick(companyId: string, query: QueryServiceAssetsDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const search = (query.search || '').trim();
    const customerId = query.customerId || undefined;

    const assetWhere: Prisma.ServiceAssetWhereInput = {
      companyId,
      status: 'ACTIVE',
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { assetNumber: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { imei: { contains: search, mode: 'insensitive' } },
              { vin: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Продадени серийни номера, които фирмата още не е завела като артикул
    const registered = await this.prisma.serviceAsset.findMany({
      where: { companyId, serialNumber: { not: null } },
      select: { serialNumber: true },
    });
    const registeredSerials = registered
      .map((r) => r.serialNumber)
      .filter((v): v is string => !!v);
    const soldWhere: Prisma.InventorySerialWhereInput = {
      companyId,
      status: 'SOLD',
      ...(registeredSerials.length
        ? { serialNumber: { notIn: registeredSerials } }
        : {}),
      orderItems: {
        some: {
          order: {
            companyId,
            status: { notIn: ['DRAFT', 'CANCELLED'] },
            ...(customerId ? { customerId } : {}),
          },
        },
      },
      ...(search
        ? {
            OR: [
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
              { product: { sku: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [assetsTotal, soldTotal] = await Promise.all([
      this.prisma.serviceAsset.count({ where: assetWhere }),
      this.prisma.inventorySerial.count({ where: soldWhere }),
    ]);

    // Страницата минава през двата списъка един след друг
    const offset = (page - 1) * limit;
    const assets =
      offset < assetsTotal
        ? await this.prisma.serviceAsset.findMany({
            where: assetWhere,
            skip: offset,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: ASSET_INCLUDE,
          })
        : [];
    const soldTake = limit - assets.length;
    const soldSkip = Math.max(0, offset - assetsTotal);
    const serialRows =
      soldTake > 0 && soldSkip < soldTotal
        ? await this.prisma.inventorySerial.findMany({
            where: soldWhere,
            skip: soldSkip,
            take: soldTake,
            orderBy: { updatedAt: 'desc' },
            include: {
              product: true,
              location: { select: { id: true, name: true } },
            },
          })
        : [];
    const sold = (
      await Promise.all(
        serialRows.map((row) => this.describeSoldSerial(companyId, row)),
      )
    ).filter((s) => s !== null);

    const total = assetsTotal + soldTotal;
    return {
      data: [
        ...assets.map((asset) => ({ kind: 'asset' as const, asset })),
        ...sold.map((s) => ({ kind: 'sold' as const, sold: s })),
      ],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // Продаден сериен номер + продажбата, клиентът и активната гаранция към него
  private async describeSoldSerial(
    companyId: string,
    serialRow: Prisma.InventorySerialGetPayload<{
      include: {
        product: true;
        location: { select: { id: true; name: true } };
      };
    }>,
  ) {
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
        serialNumber: serialRow.serialNumber,
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
