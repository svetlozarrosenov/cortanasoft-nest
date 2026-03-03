import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockTransferDto,
  UpdateStockTransferDto,
  QueryStockTransfersDto,
  ReceiveStockTransferDto,
} from './dto';
import { Prisma, StockTransferStatus } from '@prisma/client';

const TRANSFER_INCLUDE = {
  fromLocation: true,
  toLocation: true,
  responsible: {
    select: { id: true, firstName: true, lastName: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  items: {
    include: {
      product: true,
      inventoryBatch: true,
      serials: {
        include: {
          inventorySerial: true,
        },
      },
    },
  },
  _count: { select: { items: true } },
};

const VALID_TRANSITIONS: Record<StockTransferStatus, StockTransferStatus[]> = {
  DRAFT: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class StockTransfersService {
  private readonly logger = new Logger(StockTransfersService.name);

  constructor(private prisma: PrismaService) {}

  private async generateTransferNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `ST-${year}-`;

    const last = await client.stockTransfer.findFirst({
      where: {
        companyId,
        transferNumber: { startsWith: prefix },
      },
      orderBy: { transferNumber: 'desc' },
    });

    let nextNumber = 1;
    if (last) {
      const lastNumber = parseInt(last.transferNumber.split('-').pop() || '0');
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateStockTransferDto) {
    // Validate from/to locations
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Локациите "от" и "до" не могат да бъдат еднакви');
    }

    const [fromLocation, toLocation] = await Promise.all([
      this.prisma.location.findFirst({ where: { id: dto.fromLocationId, companyId } }),
      this.prisma.location.findFirst({ where: { id: dto.toLocationId, companyId } }),
    ]);
    if (!fromLocation) throw new NotFoundException('Локацията "от" не е намерена');
    if (!toLocation) throw new NotFoundException('Локацията "до" не е намерена');

    // Validate responsible user if provided
    if (dto.responsibleId) {
      const user = await this.prisma.userCompany.findFirst({
        where: { userId: dto.responsibleId, companyId },
      });
      if (!user) throw new NotFoundException('Отговорникът не е намерен');
    }

    // Validate products
    const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException('Някои продукти не са намерени');
    }

    return this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.generateTransferNumber(companyId, tx);

      const transfer = await tx.stockTransfer.create({
        data: {
          transferNumber,
          transferDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
          notes: dto.notes || undefined,
          companyId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          responsibleId: dto.responsibleId || undefined,
          createdById: userId,
          items: {
            create: await Promise.all(
              dto.items.map(async (item) => {
                const itemData: any = {
                  productId: item.productId,
                  quantity: item.quantity,
                  inventoryBatchId: item.inventoryBatchId || undefined,
                };

                // If serial IDs are provided, create serial records
                if (item.serialIds && item.serialIds.length > 0) {
                  // Validate serials exist, belong to the product, are IN_STOCK, and at the from location
                  const serials = await tx.inventorySerial.findMany({
                    where: {
                      id: { in: item.serialIds },
                      companyId,
                      productId: item.productId,
                      locationId: dto.fromLocationId,
                      status: 'IN_STOCK',
                    },
                  });
                  if (serials.length !== item.serialIds.length) {
                    throw new BadRequestException(
                      'Някои серийни номера не са налични или не са на посочената локация',
                    );
                  }

                  itemData.serials = {
                    create: item.serialIds.map((serialId) => ({
                      inventorySerialId: serialId,
                    })),
                  };
                }

                return itemData;
              }),
            ),
          },
        },
        include: TRANSFER_INCLUDE,
      });

      return transfer;
    });
  }

  async findAll(companyId: string, query: QueryStockTransfersDto) {
    const {
      search,
      status,
      fromLocationId,
      toLocationId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.StockTransferWhereInput = {
      companyId,
      ...(status && { status }),
      ...(fromLocationId && { fromLocationId }),
      ...(toLocationId && { toLocationId }),
      ...(dateFrom || dateTo
        ? {
            transferDate: {
              ...(dateFrom && { gte: new Date(dateFrom + 'T00:00:00.000Z') }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { transferNumber: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        include: {
          fromLocation: true,
          toLocation: true,
          responsible: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockTransfer.count({ where }),
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
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, companyId },
      include: TRANSFER_INCLUDE,
    });

    if (!transfer) {
      throw new NotFoundException('Трансферът не е намерен');
    }

    return transfer;
  }

  async update(companyId: string, id: string, dto: UpdateStockTransferDto) {
    const transfer = await this.findOne(companyId, id);

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Само чернови трансфери могат да бъдат редактирани');
    }

    if (dto.fromLocationId && dto.toLocationId && dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Локациите "от" и "до" не могат да бъдат еднакви');
    }

    // Validate locations if changed
    if (dto.fromLocationId) {
      const loc = await this.prisma.location.findFirst({ where: { id: dto.fromLocationId, companyId } });
      if (!loc) throw new NotFoundException('Локацията "от" не е намерена');
    }
    if (dto.toLocationId) {
      const loc = await this.prisma.location.findFirst({ where: { id: dto.toLocationId, companyId } });
      if (!loc) throw new NotFoundException('Локацията "до" не е намерена');
    }

    return this.prisma.$transaction(async (tx) => {
      // If items provided, replace all items
      if (dto.items && dto.items.length > 0) {
        // Delete existing items (cascade deletes serials)
        await tx.stockTransferItem.deleteMany({
          where: { stockTransferId: id },
        });

        const fromLocationId = dto.fromLocationId || transfer.fromLocationId;

        // Create new items
        for (const item of dto.items) {
          const itemData: any = {
            stockTransferId: id,
            productId: item.productId,
            quantity: item.quantity,
            inventoryBatchId: item.inventoryBatchId || undefined,
          };

          const createdItem = await tx.stockTransferItem.create({ data: itemData });

          if (item.serialIds && item.serialIds.length > 0) {
            const serials = await tx.inventorySerial.findMany({
              where: {
                id: { in: item.serialIds },
                companyId,
                productId: item.productId,
                locationId: fromLocationId,
                status: 'IN_STOCK',
              },
            });
            if (serials.length !== item.serialIds.length) {
              throw new BadRequestException(
                'Някои серийни номера не са налични или не са на посочената локация',
              );
            }

            await tx.stockTransferSerial.createMany({
              data: item.serialIds.map((serialId) => ({
                stockTransferItemId: createdItem.id,
                inventorySerialId: serialId,
              })),
            });
          }
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: {
          ...(dto.transferDate && { transferDate: new Date(dto.transferDate) }),
          ...(dto.fromLocationId && { fromLocationId: dto.fromLocationId }),
          ...(dto.toLocationId && { toLocationId: dto.toLocationId }),
          ...(dto.responsibleId !== undefined && { responsibleId: dto.responsibleId || null }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
        },
        include: TRANSFER_INCLUDE,
      });
    });
  }

  async ship(companyId: string, id: string) {
    const transfer = await this.findOne(companyId, id);

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Само чернови трансфери могат да бъдат изпратени');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        if (product.type === 'SERIAL') {
          // Mark serials as IN_TRANSIT
          const serialIds = item.serials.map((s) => s.inventorySerialId);
          if (serialIds.length > 0) {
            await tx.inventorySerial.updateMany({
              where: { id: { in: serialIds }, companyId },
              data: { status: 'IN_TRANSIT' },
            });
          }
        } else {
          // For batch/product — reduce quantity from source batch
          if (item.inventoryBatchId) {
            const batch = await tx.inventoryBatch.findUnique({
              where: { id: item.inventoryBatchId },
            });
            if (!batch) {
              throw new BadRequestException(`Партида не е намерена за продукт ${product.name}`);
            }
            if (Number(batch.quantity) < Number(item.quantity)) {
              throw new BadRequestException(
                `Недостатъчно количество от ${product.name} в партида ${batch.batchNumber}`,
              );
            }
            await tx.inventoryBatch.update({
              where: { id: item.inventoryBatchId },
              data: {
                quantity: { decrement: Number(item.quantity) },
              },
            });
          }
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'SHIPPED' },
        include: TRANSFER_INCLUDE,
      });
    });
  }

  async receive(companyId: string, id: string, dto: ReceiveStockTransferDto) {
    const transfer = await this.findOne(companyId, id);

    if (transfer.status !== 'SHIPPED') {
      throw new BadRequestException('Само изпратени трансфери могат да бъдат приети');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const receiveItem of dto.items) {
        const transferItem = transfer.items.find((i) => i.id === receiveItem.itemId);
        if (!transferItem) {
          throw new BadRequestException(`Артикул ${receiveItem.itemId} не е намерен в трансфера`);
        }

        const product = await tx.product.findUnique({ where: { id: transferItem.productId } });
        if (!product) continue;

        if (product.type === 'SERIAL') {
          // Process serial items
          const receivedSerialIds = receiveItem.receivedSerialIds || [];
          const allTransferSerialIds = transferItem.serials.map((s) => s.inventorySerialId);

          // Validate that received serials are part of this transfer item
          for (const serialId of receivedSerialIds) {
            if (!allTransferSerialIds.includes(serialId)) {
              throw new BadRequestException(
                `Серийният номер не принадлежи на този трансфер`,
              );
            }
          }

          // Move received serials to destination location
          if (receivedSerialIds.length > 0) {
            await tx.inventorySerial.updateMany({
              where: { id: { in: receivedSerialIds }, companyId },
              data: {
                locationId: transfer.toLocationId,
                storageZoneId: null,
                status: 'IN_STOCK',
              },
            });
          }

          // Return non-received serials to source location as IN_STOCK
          const notReceivedIds = allTransferSerialIds.filter(
            (sid) => !receivedSerialIds.includes(sid),
          );
          if (notReceivedIds.length > 0) {
            await tx.inventorySerial.updateMany({
              where: { id: { in: notReceivedIds }, companyId },
              data: { status: 'IN_STOCK' },
            });
          }

          // Mark serial records as received/not received
          for (const ts of transferItem.serials) {
            await tx.stockTransferSerial.update({
              where: { id: ts.id },
              data: { received: receivedSerialIds.includes(ts.inventorySerialId) },
            });
          }

          // Update received qty (count of received serials)
          await tx.stockTransferItem.update({
            where: { id: transferItem.id },
            data: { receivedQty: receivedSerialIds.length },
          });
        } else {
          // Batch/product — create a new batch at destination
          const receivedQty = receiveItem.receivedQty;
          if (receivedQty > 0) {
            const sourceBatch = transferItem.inventoryBatch;
            const batchNumber = `ST-${transfer.transferNumber}-${transferItem.id.slice(-4)}`;

            await tx.inventoryBatch.create({
              data: {
                batchNumber,
                quantity: receivedQty,
                initialQty: receivedQty,
                unitCost: sourceBatch ? Number(sourceBatch.unitCost) : 0,
                companyId,
                productId: transferItem.productId,
                locationId: transfer.toLocationId,
              },
            });
          }

          // If less quantity received than shipped, return the difference to source
          const shippedQty = Number(transferItem.quantity);
          const diff = shippedQty - receivedQty;
          if (diff > 0 && transferItem.inventoryBatchId) {
            await tx.inventoryBatch.update({
              where: { id: transferItem.inventoryBatchId },
              data: { quantity: { increment: diff } },
            });
          }

          await tx.stockTransferItem.update({
            where: { id: transferItem.id },
            data: { receivedQty },
          });
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: TRANSFER_INCLUDE,
      });
    });
  }

  async cancel(companyId: string, id: string) {
    const transfer = await this.findOne(companyId, id);

    if (!VALID_TRANSITIONS[transfer.status].includes('CANCELLED')) {
      throw new BadRequestException('Този трансфер не може да бъде анулиран');
    }

    return this.prisma.$transaction(async (tx) => {
      // If shipped, revert inventory changes
      if (transfer.status === 'SHIPPED') {
        for (const item of transfer.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) continue;

          if (product.type === 'SERIAL') {
            // Return serials to IN_STOCK at source location
            const serialIds = item.serials.map((s) => s.inventorySerialId);
            if (serialIds.length > 0) {
              await tx.inventorySerial.updateMany({
                where: { id: { in: serialIds }, companyId },
                data: { status: 'IN_STOCK' },
              });
            }
          } else {
            // Return quantity to source batch
            if (item.inventoryBatchId) {
              await tx.inventoryBatch.update({
                where: { id: item.inventoryBatchId },
                data: { quantity: { increment: Number(item.quantity) } },
              });
            }
          }
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: TRANSFER_INCLUDE,
      });
    });
  }

  async remove(companyId: string, id: string) {
    const transfer = await this.findOne(companyId, id);

    if (transfer.status !== 'DRAFT') {
      throw new BadRequestException('Само чернови трансфери могат да бъдат изтрити');
    }

    await this.prisma.stockTransfer.delete({ where: { id } });
    return { success: true };
  }
}
