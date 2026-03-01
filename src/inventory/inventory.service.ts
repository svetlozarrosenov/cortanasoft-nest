import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryInventoryDto,
  QueryStockLevelsDto,
  UpdateInventoryBatchDto,
  UpdateInventorySerialDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query: QueryInventoryDto) {
    const {
      search,
      productId,
      locationId,
      storageZoneId,
      goodsReceiptId,
      expiryDateFrom,
      expiryDateTo,
      hasStock,
      expiringSoon,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Calculate date for "expiring soon" (next 30 days)
    const expiringSoonDate = new Date();
    expiringSoonDate.setDate(expiringSoonDate.getDate() + 30);

    const where: Prisma.InventoryBatchWhereInput = {
      companyId,
      ...(productId && { productId }),
      ...(locationId && { locationId }),
      ...(storageZoneId && { storageZoneId }),
      ...(goodsReceiptId && {
        goodsReceiptItem: {
          goodsReceiptId: goodsReceiptId,
        },
      }),
      ...(hasStock === true && { quantity: { gt: 0 } }),
      ...(hasStock === false && { quantity: { lte: 0 } }),
      ...((expiringSoon || expiryDateFrom || expiryDateTo) && {
        expiryDate: {
          ...(expiringSoon && !expiryDateFrom && { gte: new Date() }),
          ...(expiringSoon && !expiryDateTo && { lte: expiringSoonDate }),
          ...(expiryDateFrom && { gte: new Date(expiryDateFrom) }),
          ...(expiryDateTo && { lte: new Date(expiryDateTo) }),
        },
      }),
      ...(search && {
        OR: [
          { batchNumber: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { product: { sku: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    // Handle custom sorting
    let orderBy: Prisma.InventoryBatchOrderByWithRelationInput = {};
    if (sortBy === 'productName') {
      orderBy = { product: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryBatch.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              type: true,
            },
          },
          location: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          storageZone: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          goodsReceiptItem: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              goodsReceipt: {
                select: {
                  id: true,
                  receiptNumber: true,
                  receiptDate: true,
                  status: true,
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryBatch.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id, companyId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            type: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        storageZone: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        goodsReceiptItem: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            vatRate: true,
            goodsReceipt: {
              select: {
                id: true,
                receiptNumber: true,
                receiptDate: true,
                status: true,
                invoiceNumber: true,
                invoiceDate: true,
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    eik: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(ErrorMessages.inventory.batchNotFound);
    }

    return batch;
  }

  async update(companyId: string, id: string, dto: UpdateInventoryBatchDto) {
    const batch = await this.findOne(companyId, id);

    // Verify storage zone if provided
    if (dto.storageZoneId) {
      const zone = await this.prisma.storageZone.findFirst({
        where: { id: dto.storageZoneId, locationId: batch.locationId },
      });
      if (!zone) {
        throw new BadRequestException(ErrorMessages.inventory.storageZoneNotFound);
      }
    }

    return this.prisma.inventoryBatch.update({
      where: { id },
      data: {
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.manufacturingDate !== undefined && {
          manufacturingDate: dto.manufacturingDate
            ? new Date(dto.manufacturingDate)
            : null,
        }),
        ...(dto.storageZoneId !== undefined && {
          storageZoneId: dto.storageZoneId || null,
        }),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            type: true,
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        storageZone: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async findOneSerial(companyId: string, id: string) {
    const serial = await this.prisma.inventorySerial.findFirst({
      where: { id, companyId },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            type: true,
          },
        },
        location: {
          select: { id: true, code: true, name: true },
        },
        storageZone: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!serial) {
      throw new NotFoundException(ErrorMessages.inventory.serialNotFound);
    }

    return serial;
  }

  async updateSerial(
    companyId: string,
    id: string,
    dto: UpdateInventorySerialDto,
  ) {
    const serial = await this.findOneSerial(companyId, id);

    // Verify storage zone if provided
    if (dto.storageZoneId) {
      const zone = await this.prisma.storageZone.findFirst({
        where: { id: dto.storageZoneId, locationId: serial.locationId },
      });
      if (!zone) {
        throw new BadRequestException(
          ErrorMessages.inventory.storageZoneNotFound,
        );
      }
    }

    // If changing serial number, only allow when IN_STOCK and check uniqueness
    if (dto.serialNumber && dto.serialNumber !== serial.serialNumber) {
      if (serial.status !== 'IN_STOCK') {
        throw new BadRequestException(
          'Може да променяте серийния номер само когато е наличен на склад',
        );
      }

      const existing = await this.prisma.inventorySerial.findFirst({
        where: {
          companyId,
          productId: serial.productId,
          serialNumber: dto.serialNumber,
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException(
          ErrorMessages.inventory.serialDuplicate(dto.serialNumber),
        );
      }
    }

    return this.prisma.inventorySerial.update({
      where: { id },
      data: {
        ...(dto.serialNumber !== undefined && {
          serialNumber: dto.serialNumber,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.storageZoneId !== undefined && {
          storageZoneId: dto.storageZoneId || null,
        }),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            type: true,
          },
        },
        location: {
          select: { id: true, code: true, name: true },
        },
        storageZone: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  async getStockLevels(companyId: string, query: QueryStockLevelsDto) {
    const {
      search,
      locationId,
      categoryId,
      hasStock,
      belowMinStock,
      page = 1,
      limit = 20,
    } = query;

    // Build product filter
    const productWhere: Prisma.ProductWhereInput = {
      companyId,
      trackInventory: true,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // When hasStock or belowMinStock filters are active, we need to fetch ALL products
    // and filter in-memory BEFORE applying pagination, to get correct results and counts.
    const needsInMemoryFilter = hasStock !== undefined || belowMinStock;

    // Get products with inventory aggregation
    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        minStock: true,
        type: true,
        category: {
          select: { id: true, name: true },
        },
        inventoryBatches: {
          where: {
            ...(locationId && { locationId }),
          },
          select: {
            id: true,
            quantity: true,
            locationId: true,
            location: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        inventorySerials: {
          where: {
            status: 'IN_STOCK',
            ...(locationId && { locationId }),
          },
          select: {
            id: true,
            locationId: true,
            location: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      // Only apply DB-level pagination when no in-memory filters are needed
      ...(!needsInMemoryFilter && {
        skip: (page - 1) * limit,
        take: limit,
      }),
      orderBy: { name: 'asc' },
    });

    // Calculate stock levels
    const stockLevels = products.map((product) => {
      const locationMap = new Map<
        string,
        { location: any; quantity: number }
      >();

      let totalQuantity: number;

      if (product.type === 'SERIAL') {
        // For SERIAL products: count InventorySerial records with IN_STOCK status
        totalQuantity = product.inventorySerials.length;

        for (const serial of product.inventorySerials) {
          const existing = locationMap.get(serial.locationId);
          if (existing) {
            existing.quantity += 1;
          } else {
            locationMap.set(serial.locationId, {
              location: serial.location,
              quantity: 1,
            });
          }
        }
      } else {
        // For PRODUCT, BATCH — sum batch quantities
        totalQuantity = product.inventoryBatches.reduce(
          (sum, batch) => sum + Number(batch.quantity),
          0,
        );

        for (const batch of product.inventoryBatches) {
          const existing = locationMap.get(batch.locationId);
          if (existing) {
            existing.quantity += Number(batch.quantity);
          } else {
            locationMap.set(batch.locationId, {
              location: batch.location,
              quantity: Number(batch.quantity),
            });
          }
        }
      }

      return {
        productId: product.id,
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          minStock: product.minStock,
          type: product.type,
          category: product.category,
        },
        totalQuantity,
        minStock: product.minStock ? Number(product.minStock) : null,
        isBelowMinStock: product.minStock
          ? totalQuantity < Number(product.minStock)
          : false,
        locationBreakdown: Array.from(locationMap.values()),
        batchCount:
          product.type === 'SERIAL'
            ? product.inventorySerials.length
            : product.inventoryBatches.length,
      };
    });

    // Apply in-memory filters
    let filtered = stockLevels;
    if (hasStock === true) {
      filtered = filtered.filter((s) => s.totalQuantity > 0);
    } else if (hasStock === false) {
      filtered = filtered.filter((s) => s.totalQuantity <= 0);
    }
    if (belowMinStock) {
      filtered = filtered.filter((s) => s.isBelowMinStock);
    }

    // When in-memory filtering is active, apply pagination after filtering
    const total = needsInMemoryFilter
      ? filtered.length
      : await this.prisma.product.count({ where: productWhere });

    const paginatedData = needsInMemoryFilter
      ? filtered.slice((page - 1) * limit, page * limit)
      : filtered;

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllSerials(
    companyId: string,
    params: {
      productId?: string;
      locationId?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      productId,
      locationId,
      status,
      search,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.InventorySerialWhereInput = {
      companyId,
      ...(productId && { productId }),
      ...(locationId && { locationId }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          {
            product: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            product: {
              sku: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.inventorySerial.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              unit: true,
              type: true,
            },
          },
          location: {
            select: { id: true, code: true, name: true },
          },
          goodsReceiptItem: {
            select: {
              id: true,
              goodsReceipt: {
                select: {
                  id: true,
                  receiptNumber: true,
                  receiptDate: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventorySerial.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getByLocation(
    companyId: string,
    locationId: string,
    query: QueryInventoryDto,
  ) {
    // Verify location exists
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, companyId },
    });
    if (!location) {
      throw new NotFoundException(ErrorMessages.inventory.locationNotFound);
    }

    return this.findAll(companyId, { ...query, locationId });
  }

  async getByProduct(
    companyId: string,
    productId: string,
    query: QueryInventoryDto,
  ) {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.inventory.productNotFound);
    }

    return this.findAll(companyId, { ...query, productId });
  }

  async getByGoodsReceipt(companyId: string, goodsReceiptId: string) {
    // Verify goods receipt exists
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id: goodsReceiptId, companyId },
    });
    if (!receipt) {
      throw new NotFoundException(ErrorMessages.inventory.goodsReceiptNotFound);
    }

    return this.findAll(companyId, { goodsReceiptId, limit: 100 });
  }
}
