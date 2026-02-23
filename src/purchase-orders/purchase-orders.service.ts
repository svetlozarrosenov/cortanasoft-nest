import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
} from './dto';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const lastOrder = await this.prisma.purchaseOrder.findFirst({
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

  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(ErrorMessages.purchaseOrders.mustHaveItems);
    }

    // Verify supplier exists and belongs to company
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
    });
    if (!supplier) {
      throw new NotFoundException(ErrorMessages.purchaseOrders.supplierNotFound);
    }

    // Verify all products exist
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(ErrorMessages.purchaseOrders.productsNotFound);
    }

    // Get company for VAT default
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true },
    });
    const defaultVatRate = company?.vatNumber ? 20 : 0;

    // Generate order number
    const orderNumber =
      dto.orderNumber || (await this.generateOrderNumber(companyId));

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate = item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemVat = itemSubtotal * (itemVatRate / 100);

      subtotal += itemSubtotal;
      vatAmount += itemVat;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: itemVatRate,
        subtotal: itemSubtotal,
        receivedQty: 0,
      };
    });

    const total = subtotal + vatAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        status: 'DRAFT',
        subtotal,
        vatAmount,
        total,
        notes: dto.notes,
        companyId,
        supplierId: dto.supplierId,
        createdById: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });
  }

  async findAll(companyId: string, query: QueryPurchaseOrdersDto) {
    const {
      search,
      status,
      supplierId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(dateFrom || dateTo
        ? {
            orderDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true, goodsReceipts: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
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
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        goodsReceipts: {
          include: {
            items: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.purchaseOrders.notFound);
    }

    return order;
  }

  async update(companyId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.canOnlyUpdateDraft);
    }

    // Verify new supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId },
      });
      if (!supplier) {
        throw new NotFoundException(ErrorMessages.purchaseOrders.supplierNotFound);
      }
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.orderDate && { orderDate: new Date(dto.orderDate) }),
        ...(dto.expectedDate !== undefined && {
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        }),
        ...(dto.supplierId && { supplierId: dto.supplierId }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });
  }

  async send(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.canOnlySendDraft);
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(ErrorMessages.purchaseOrders.cannotSendWithoutItems);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });
  }

  async confirm(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'SENT') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.canOnlyConfirmSent);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });
  }

  async updateReceivedQuantities(companyId: string, id: string) {
    // This is called when a goods receipt is completed
    // to update the purchase order status based on received quantities
    const order = await this.findOne(companyId, id);

    let allReceived = true;
    let someReceived = false;

    for (const item of order.items) {
      const receivedQty = Number(item.receivedQty);
      const orderedQty = Number(item.quantity);

      if (receivedQty >= orderedQty) {
        someReceived = true;
      } else {
        allReceived = false;
        if (receivedQty > 0) {
          someReceived = true;
        }
      }
    }

    let newStatus: PurchaseOrderStatus = order.status;

    if (allReceived) {
      newStatus = 'RECEIVED';
    } else if (someReceived) {
      newStatus = 'PARTIAL';
    }

    if (newStatus !== order.status) {
      return this.prisma.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: {
          supplier: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
            },
          },
          _count: { select: { items: true, goodsReceipts: true } },
        },
      });
    }

    return order;
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.alreadyCancelled);
    }

    if (order.status === 'RECEIVED') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.cannotCancelFullyReceived);
    }

    // Check if any goods receipts exist
    if (order.goodsReceipts && order.goodsReceipts.length > 0) {
      const completedReceipts = order.goodsReceipts.filter(
        (r) => r.status === 'COMPLETED',
      );
      if (completedReceipts.length > 0) {
        throw new BadRequestException(ErrorMessages.purchaseOrders.cannotCancelWithCompletedReceipts);
      }
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        _count: { select: { items: true, goodsReceipts: true } },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.purchaseOrders.canOnlyDeleteDraft);
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    return { message: 'Заявката за покупка е изтрита успешно' };
  }

  // Get pending items (items with remaining quantity to receive)
  async getPendingItems(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (!['SENT', 'CONFIRMED', 'PARTIAL'].includes(order.status)) {
      throw new BadRequestException(ErrorMessages.purchaseOrders.mustBeSentOrConfirmed);
    }

    const pendingItems = order.items
      .map((item) => {
        const orderedQty = Number(item.quantity);
        const receivedQty = Number(item.receivedQty);
        const remainingQty = orderedQty - receivedQty;

        return {
          id: item.id,
          productId: item.productId,
          product: item.product,
          orderedQty,
          receivedQty,
          remainingQty,
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
        };
      })
      .filter((item) => item.remainingQty > 0);

    return pendingItems;
  }
}
