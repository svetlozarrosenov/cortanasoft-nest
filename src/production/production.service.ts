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
  IssueMaterialDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

const defaultInclude = {
  product: true,
  bom: { include: { items: { include: { product: true } } } },
  customer: { select: { id: true, companyName: true, firstName: true, lastName: true } },
  location: true,
  issuances: {
    where: { returned: false },
    include: {
      product: true,
      location: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { issuedAt: 'desc' as const },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRD-${year}-`;

    const lastOrder = await this.prisma.productionOrder.findFirst({
      where: { companyId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastOrder) {
      nextNumber = parseInt(lastOrder.orderNumber.split('-').pop() || '0') + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateProductionOrderDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.production.productNotFound);
    }

    if (dto.bomId) {
      const bom = await this.prisma.billOfMaterial.findFirst({
        where: { id: dto.bomId, companyId },
      });
      if (!bom) {
        throw new NotFoundException(ErrorMessages.production.bomNotFound);
      }
    }

    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(ErrorMessages.production.locationNotFound);
      }
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.production.customerNotFound);
      }
    }

    const orderNumber = dto.orderNumber || (await this.generateOrderNumber(companyId));

    return this.prisma.productionOrder.create({
      data: {
        orderNumber,
        title: dto.title,
        quantity: dto.quantity,
        status: 'DRAFT',
        productId: dto.productId,
        bomId: dto.bomId,
        customerId: dto.customerId,
        locationId: dto.locationId,
        companyId,
        createdById: userId,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
        notes: dto.notes,
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
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
          { product: { name: { contains: search, mode: 'insensitive' as const } } },
          { customer: { companyName: { contains: search, mode: 'insensitive' as const } } },
          { customer: { lastName: { contains: search, mode: 'insensitive' as const } } },
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
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

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        ...(dto.productId !== undefined && { productId: dto.productId }),
        ...(dto.bomId !== undefined && { bomId: dto.bomId || null }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.locationId !== undefined && { locationId: dto.locationId }),
        ...(dto.plannedStartDate !== undefined && {
          plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null,
        }),
        ...(dto.plannedEndDate !== undefined && {
          plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: defaultInclude,
    });
  }

  /**
   * Start production. If the order has a BOM, automatically issue the planned
   * materials from stock. If there's no BOM (custom job), just mark as
   * IN_PROGRESS — materials will be issued ad-hoc via issueMaterial().
   */
  async start(companyId: string, id: string, userId?: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: { bom: { include: { items: { include: { product: true } } } } },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }
    if (order.status !== 'DRAFT' && order.status !== 'PLANNED') {
      throw new BadRequestException(ErrorMessages.production.canOnlyStartDraftOrPlanned);
    }

    return this.prisma.$transaction(async (tx) => {
      // Auto-issue from BOM (if present). Unit cost is derived from actual FIFO batches.
      if (order.bom && order.bom.items.length > 0) {
        const outputQty = Number(order.bom.outputQuantity) || 1;
        const scale = Number(order.quantity) / outputQty;

        for (const bomItem of order.bom.items) {
          const qty = Number(bomItem.quantity) * scale;
          await this.deductAndLog(tx, {
            companyId,
            productionOrderId: order.id,
            productId: bomItem.productId,
            quantity: qty,
            productName: bomItem.product.name,
            locationId: order.locationId,
            userId,
            notes: 'Автоматично от рецепта',
          });
        }
      }

      return tx.productionOrder.update({
        where: { id },
        data: { status: 'IN_PROGRESS', actualStartDate: new Date() },
        include: defaultInclude,
      });
    });
  }

  /**
   * Issue an ad-hoc material during IN_PROGRESS (custom production workflow).
   */
  async issueMaterial(
    companyId: string,
    orderId: string,
    userId: string,
    dto: IssueMaterialDto,
  ) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id: orderId, companyId },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(ErrorMessages.production.canOnlyIssueInProgress);
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(ErrorMessages.production.productNotFound);
    }

    return this.prisma.$transaction(async (tx) => {
      const issuance = await this.deductAndLog(tx, {
        companyId,
        productionOrderId: orderId,
        productId: dto.productId,
        quantity: dto.quantity,
        productName: product.name,
        locationId: dto.locationId ?? order.locationId,
        userId,
        notes: dto.notes,
      });

      return issuance;
    });
  }

  /**
   * Return an issued material back to stock.
   */
  async returnMaterial(companyId: string, issuanceId: string) {
    const issuance = await this.prisma.productionMaterialIssuance.findFirst({
      where: { id: issuanceId, companyId },
      include: { productionOrder: true },
    });
    if (!issuance) {
      throw new NotFoundException(ErrorMessages.production.issuanceNotFound);
    }
    if (issuance.returned) {
      throw new BadRequestException(ErrorMessages.production.alreadyReturned);
    }
    if (issuance.productionOrder.status === 'COMPLETED') {
      throw new BadRequestException(ErrorMessages.production.cannotReturnCompleted);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.restoreToStock(tx, {
        companyId,
        productId: issuance.productId,
        quantity: Number(issuance.quantity),
        unitCost: Number(issuance.unitCost),
        locationId: issuance.locationId,
        batchRef: issuance.productionOrder.orderNumber,
      });

      return tx.productionMaterialIssuance.update({
        where: { id: issuanceId },
        data: { returned: true },
      });
    });
  }

  async complete(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: {
        issuances: { where: { returned: false } },
        product: true,
      },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(ErrorMessages.production.canOnlyCompleteInProgress);
    }

    // Determine location for finished inventory
    let locationId = order.locationId;
    if (!locationId) {
      const defaultLocation = await this.prisma.location.findFirst({
        where: { companyId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
      if (defaultLocation) locationId = defaultLocation.id;
    }

    // Cost from actual issuances (snapshotted unit costs)
    const totalMaterialCost = order.issuances.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unitCost),
      0,
    );
    const finishedQty = Number(order.quantity);
    const calculatedUnitCost = finishedQty > 0 ? totalMaterialCost / finishedQty : 0;

    return this.prisma.$transaction(async (tx) => {
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
        data: { status: 'COMPLETED', actualEndDate: new Date() },
        include: defaultInclude,
      });
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: { issuances: { where: { returned: false } } },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.production.notFound);
    }
    if (order.status === 'COMPLETED') {
      throw new BadRequestException(ErrorMessages.production.cannotCancelCompleted);
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.production.alreadyCancelled);
    }

    return this.prisma.$transaction(async (tx) => {
      // Restore all active issuances back to stock and mark them returned
      for (const iss of order.issuances) {
        await this.restoreToStock(tx, {
          companyId,
          productId: iss.productId,
          quantity: Number(iss.quantity),
          unitCost: Number(iss.unitCost),
          locationId: iss.locationId,
          batchRef: order.orderNumber,
        });
        await tx.productionMaterialIssuance.update({
          where: { id: iss.id },
          data: { returned: true },
        });
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
      throw new BadRequestException(ErrorMessages.production.canOnlyDeleteDraft);
    }

    await this.prisma.productionOrder.delete({ where: { id } });
    return { message: 'Производствената поръчка е изтрита успешно' };
  }

  /**
   * Read-only preview of the planned materials for a BOM-linked order,
   * scaled by the production quantity. Returns empty array for custom orders.
   */
  async getPlannedMaterials(companyId: string, id: string) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: {
        bom: { include: { items: { include: { product: true } } } },
      },
    });
    if (!order) throw new NotFoundException(ErrorMessages.production.notFound);
    if (!order.bom) return [];

    const outputQty = Number(order.bom.outputQuantity) || 1;
    const scale = Number(order.quantity) / outputQty;

    return order.bom.items.map((item) => ({
      productId: item.productId,
      product: item.product,
      plannedQuantity: Number(item.quantity) * scale,
      unit: item.unit,
    }));
  }

  // ==================== Internal helpers ====================

  /**
   * FIFO-deduct `quantity` of product from stock at given location (or any),
   * record a ProductionMaterialIssuance with weighted-avg unitCost snapshot
   * from the actually-consumed inventory batches.
   */
  private async deductAndLog(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productionOrderId: string;
      productId: string;
      quantity: number;
      productName: string;
      locationId: string | null | undefined;
      userId?: string;
      notes?: string;
    },
  ) {
    const batchWhere: Prisma.InventoryBatchWhereInput = {
      productId: params.productId,
      companyId: params.companyId,
      quantity: { gt: 0 },
      ...(params.locationId && { locationId: params.locationId }),
    };

    const batches = await tx.inventoryBatch.findMany({
      where: batchWhere,
      orderBy: { createdAt: 'asc' }, // FIFO
    });

    const totalAvailable = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
    if (totalAvailable < params.quantity) {
      throw new BadRequestException(
        ErrorMessages.production.insufficientMaterials(
          params.productName,
          totalAvailable,
          params.quantity,
        ),
      );
    }

    let remaining = params.quantity;
    let costAccum = 0;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const batchQty = Number(batch.quantity);
      const deduct = Math.min(batchQty, remaining);
      const unitCost = Number(batch.unitCost || 0);

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { quantity: batchQty - deduct },
      });

      costAccum += deduct * unitCost;
      remaining -= deduct;
    }

    const weightedAvgCost = params.quantity > 0 ? costAccum / params.quantity : 0;

    return tx.productionMaterialIssuance.create({
      data: {
        productionOrderId: params.productionOrderId,
        productId: params.productId,
        quantity: params.quantity,
        unitCost: weightedAvgCost,
        locationId: params.locationId ?? null,
        companyId: params.companyId,
        createdById: params.userId,
        notes: params.notes,
      },
      include: {
        product: true,
        location: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Restore quantity to stock — used for returns and cancellations.
   * Increments existing batch at the same location+product if found, else creates a new restore batch.
   */
  private async restoreToStock(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      productId: string;
      quantity: number;
      unitCost: number;
      locationId: string | null;
      batchRef: string;
    },
  ) {
    let locationId = params.locationId;
    if (!locationId) {
      const defaultLocation = await tx.location.findFirst({
        where: { companyId: params.companyId, isActive: true },
        orderBy: { isDefault: 'desc' },
      });
      if (defaultLocation) locationId = defaultLocation.id;
    }
    if (!locationId) return;

    const existing = await tx.inventoryBatch.findFirst({
      where: { productId: params.productId, companyId: params.companyId, locationId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await tx.inventoryBatch.update({
        where: { id: existing.id },
        data: { quantity: Number(existing.quantity) + params.quantity },
      });
    } else {
      await tx.inventoryBatch.create({
        data: {
          batchNumber: `RESTORE-${params.batchRef}-${params.productId.slice(-4)}`,
          quantity: params.quantity,
          initialQty: params.quantity,
          unitCost: params.unitCost,
          productId: params.productId,
          companyId: params.companyId,
          locationId,
        },
      });
    }
  }
}
