import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  QueryProductionOrdersDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

const defaultInclude = {
  product: true,
  bom: { include: { items: { include: { product: true } } } },
  location: true,
  materials: { include: { product: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRD-${year}-`;

    const lastOrder = await this.prisma.productionOrder.findFirst({
      where: {
        companyId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(
        lastOrder.orderNumber.split('-').pop() || '0',
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateProductionOrderDto) {
    // Validate product
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.production.productNotFound);
    }

    // Validate BOM
    const bom = await this.prisma.billOfMaterial.findFirst({
      where: { id: dto.bomId, companyId },
      include: { items: true },
    });
    if (!bom) {
      throw new NotFoundException(ErrorMessages.production.bomNotFound);
    }

    // Validate location
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(ErrorMessages.production.locationNotFound);
      }
    }

    const orderNumber =
      dto.orderNumber || (await this.generateOrderNumber(companyId));

    // Auto-calculate materials from BOM if not provided
    const outputQty = Number(bom.outputQuantity);
    const scale = dto.quantity / outputQty;

    const materialsData = dto.materials?.length
      ? dto.materials.map((m) => ({
          productId: m.productId,
          plannedQuantity: m.plannedQuantity,
          unit: m.unit ?? 'PIECE' as const,
        }))
      : bom.items.map((item) => ({
          productId: item.productId,
          plannedQuantity: Number(item.quantity) * scale,
          unit: item.unit,
        }));

    return this.prisma.productionOrder.create({
      data: {
        orderNumber,
        quantity: dto.quantity,
        status: 'DRAFT',
        productId: dto.productId,
        bomId: dto.bomId,
        locationId: dto.locationId,
        companyId,
        createdById: userId,
        plannedStartDate: dto.plannedStartDate
          ? new Date(dto.plannedStartDate)
          : undefined,
        plannedEndDate: dto.plannedEndDate
          ? new Date(dto.plannedEndDate)
          : undefined,
        notes: dto.notes,
        materials: {
          create: materialsData,
        },
      },
      include: defaultInclude,
    });
  }

  async findAll(companyId: string, query: QueryProductionOrdersDto) {
    const {
      search,
      status,
      productId,
      locationId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductionOrderWhereInput = {
      companyId,
      ...(status && { status }),
      ...(productId && { productId }),
      ...(locationId && { locationId }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && {
                lte: new Date(dateTo + 'T23:59:59.999Z'),
              }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          {
            product: {
              name: { contains: search, mode: 'insensitive' as const },
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        include: defaultInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productionOrder.count({ where }),
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
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: defaultInclude,
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    return order;
  }

  async update(companyId: string, id: string, dto: UpdateProductionOrderDto) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    if (order.status !== 'DRAFT' && order.status !== 'PLANNED') {
      throw new BadRequestException(
        ErrorMessages.production.canOnlyUpdateDraftOrPlanned,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.materials) {
        await tx.productionOrderMaterial.deleteMany({
          where: { productionOrderId: id },
        });
      }

      return tx.productionOrder.update({
        where: { id },
        data: {
          ...(dto.productId !== undefined && { productId: dto.productId }),
          ...(dto.bomId !== undefined && { bomId: dto.bomId }),
          ...(dto.quantity !== undefined && { quantity: dto.quantity }),
          ...(dto.locationId !== undefined && { locationId: dto.locationId }),
          ...(dto.plannedStartDate !== undefined && {
            plannedStartDate: new Date(dto.plannedStartDate),
          }),
          ...(dto.plannedEndDate !== undefined && {
            plannedEndDate: new Date(dto.plannedEndDate),
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.materials && {
            materials: {
              create: dto.materials.map((m) => ({
                productId: m.productId,
                plannedQuantity: m.plannedQuantity,
                unit: m.unit ?? 'PIECE',
              })),
            },
          }),
        },
        include: defaultInclude,
      });
    });
  }

  async start(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: { materials: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    if (order.status !== 'DRAFT' && order.status !== 'PLANNED') {
      throw new BadRequestException(
        ErrorMessages.production.canOnlyStartDraftOrPlanned,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct materials from inventory using FIFO
      for (const material of order.materials) {
        const requiredQty = Number(material.plannedQuantity);

        // Get available batches for this product at this location
        const batchWhere: Prisma.InventoryBatchWhereInput = {
          productId: material.productId,
          companyId,
          quantity: { gt: 0 },
          ...(order.locationId && { locationId: order.locationId }),
        };

        const batches = await tx.inventoryBatch.findMany({
          where: batchWhere,
          orderBy: { createdAt: 'asc' }, // FIFO
        });

        const totalAvailable = batches.reduce(
          (sum, b) => sum + Number(b.quantity),
          0,
        );

        if (totalAvailable < requiredQty) {
          throw new BadRequestException(
            ErrorMessages.production.insufficientMaterials(
              material.product.name,
              totalAvailable,
              requiredQty,
            ),
          );
        }

        // Deduct using FIFO
        let remaining = requiredQty;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const batchQty = Number(batch.quantity);
          const deduct = Math.min(batchQty, remaining);

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: batchQty - deduct },
          });

          remaining -= deduct;
        }
      }

      return tx.productionOrder.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          actualStartDate: new Date(),
        },
        include: defaultInclude,
      });
    });
  }

  async complete(
    companyId: string,
    id: string,
    actualMaterials?: { productId: string; actualQuantity: number }[],
  ) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: { materials: { include: { product: true } }, product: true },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        ErrorMessages.production.canOnlyCompleteInProgress,
      );
    }

    // Determine location for inventory
    let locationId = order.locationId;
    if (!locationId) {
      const defaultLocation = await this.prisma.location.findFirst({
        where: { companyId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
      if (defaultLocation) {
        locationId = defaultLocation.id;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update actual quantities if provided
      if (actualMaterials) {
        for (const am of actualMaterials) {
          const material = order.materials.find(
            (m) => m.productId === am.productId,
          );
          if (material) {
            await tx.productionOrderMaterial.update({
              where: { id: material.id },
              data: { actualQuantity: am.actualQuantity },
            });
          }
        }
      }

      // Calculate unit cost from materials
      let totalMaterialCost = 0;
      for (const material of order.materials) {
        const batches = await tx.inventoryBatch.findMany({
          where: {
            productId: material.productId,
            companyId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        const unitCost = batches.length > 0 ? Number(batches[0].unitCost || 0) : 0;
        totalMaterialCost += Number(material.plannedQuantity) * unitCost;
      }

      const finishedQty = Number(order.quantity);
      const calculatedUnitCost = finishedQty > 0 ? totalMaterialCost / finishedQty : 0;

      // Create inventory batch for finished product
      if (locationId) {
        await tx.inventoryBatch.create({
          data: {
            batchNumber: `PRD-${order.orderNumber}`,
            quantity: finishedQty,
            initialQty: finishedQty,
            unitCost: calculatedUnitCost,
            productId: order.productId,
            companyId,
            locationId,
          },
        });
      }

      return tx.productionOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualEndDate: new Date(),
        },
        include: defaultInclude,
      });
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: { materials: true },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    if (order.status === 'COMPLETED') {
      throw new BadRequestException(
        ErrorMessages.production.cannotCancelCompleted,
      );
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.production.alreadyCancelled);
    }

    // Determine location for restoring inventory
    let restoreLocationId = order.locationId;
    if (!restoreLocationId) {
      const defaultLocation = await this.prisma.location.findFirst({
        where: { companyId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
      if (defaultLocation) {
        restoreLocationId = defaultLocation.id;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If IN_PROGRESS, restore materials to inventory
      if (order.status === 'IN_PROGRESS' && restoreLocationId) {
        for (const material of order.materials) {
          const requiredQty = Number(material.plannedQuantity);

          const existingBatch = await tx.inventoryBatch.findFirst({
            where: {
              productId: material.productId,
              companyId,
              locationId: restoreLocationId,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (existingBatch) {
            await tx.inventoryBatch.update({
              where: { id: existingBatch.id },
              data: {
                quantity: Number(existingBatch.quantity) + requiredQty,
              },
            });
          } else {
            await tx.inventoryBatch.create({
              data: {
                batchNumber: `RESTORE-${order.orderNumber}-${material.productId.slice(-4)}`,
                quantity: requiredQty,
                initialQty: requiredQty,
                unitCost: 0,
                productId: material.productId,
                companyId,
                locationId: restoreLocationId,
              },
            });
          }
        }
      }

      return tx.productionOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: defaultInclude,
      });
    });
  }

  async remove(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        ErrorMessages.production.canOnlyDeleteDraft,
      );
    }

    await this.prisma.productionOrder.delete({ where: { id } });

    return { message: 'Производствената поръчка е изтрита успешно' };
  }
}
