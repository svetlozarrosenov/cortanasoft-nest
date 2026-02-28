import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto, QueryOrdersDto } from './dto';
import { Prisma, OrderStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Определя ДДС ставката по подразбиране за компания.
   * Ако компанията е регистрирана по ДДС (има vatNumber), връща 20%.
   * Ако не е регистрирана, връща 0%.
   */
  private async getDefaultVatRate(companyId: string): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true },
    });
    return company?.vatNumber ? 20 : 0;
  }

  private async generateOrderNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    const lastOrder = await this.prisma.order.findFirst({
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

  async create(companyId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(ErrorMessages.orders.mustHaveItems);
    }

    // Get company for default currency and VAT
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Компанията не е намерена');
    }

    const defaultVatRate = company.vatNumber ? 20 : 0;

    // Verify location if provided
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(ErrorMessages.orders.locationNotFound);
      }
    }

    // Verify all products exist
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(ErrorMessages.orders.productsNotFound);
    }

    // Generate order number
    const orderNumber =
      dto.orderNumber || (await this.generateOrderNumber(companyId));

    // Use company currency as default
    const currencyId = dto.currencyId || company.currencyId;

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate = item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemDiscount = item.discount ?? 0;
      const itemSubtotal = item.quantity * item.unitPrice - itemDiscount;
      const itemVat = itemSubtotal * (itemVatRate / 100);

      subtotal += itemSubtotal;
      vatAmount += itemVat;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: itemVatRate,
        discount: itemDiscount,
        subtotal: itemSubtotal,
        inventoryBatchId: item.inventoryBatchId,
      };
    });

    const orderDiscount = dto.discount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const total = subtotal + vatAmount + shippingCost - orderDiscount;

    return this.prisma.order.create({
      data: {
        orderNumber,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        status: 'PENDING', // Create orders directly as PENDING, skip DRAFT
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingPostalCode: dto.shippingPostalCode,
        paymentMethod: dto.paymentMethod,
        shippingCost,
        discount: orderDiscount,
        subtotal,
        vatAmount,
        total,
        notes: dto.notes,
        currencyId,
        companyId,
        locationId: dto.locationId,
        createdById: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        location: true,
        customer: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            inventoryBatch: true,
          },
        },
        _count: { select: { items: true } },
      },
    });
  }

  async findAll(companyId: string, query: QueryOrdersDto) {
    const {
      search,
      status,
      paymentStatus,
      locationId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.OrderWhereInput = {
      companyId,
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(locationId && { locationId }),
      ...(dateFrom || dateTo
        ? {
            orderDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          location: true,
          customer: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              inventoryBatch: true,
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
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
    const order = await this.prisma.order.findFirst({
      where: { id, companyId },
      include: {
        location: true,
        customer: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            inventoryBatch: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.orders.notFound);
    }

    return order;
  }

  // Valid status transitions state machine
  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: ['PENDING', 'CANCELLED'],
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  async update(companyId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(companyId, id);

    // If status change is requested, handle it through the state machine
    if (dto.status && dto.status !== order.status) {
      const allowedTargets = this.validTransitions[order.status] || [];
      if (!allowedTargets.includes(dto.status)) {
        throw new BadRequestException(ErrorMessages.orders.invalidStatusTransition);
      }

      // Route to confirm/cancel for transitions with inventory side effects
      if (dto.status === 'CONFIRMED' && order.status === 'PENDING') {
        return this.confirm(companyId, id);
      }
      if (dto.status === 'CANCELLED') {
        return this.cancel(companyId, id);
      }

      // Simple status transitions (CONFIRMED→PROCESSING, PROCESSING→SHIPPED, SHIPPED→DELIVERED)
      return this.prisma.order.update({
        where: { id },
        data: { status: dto.status },
        include: {
          location: true,
          customer: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              inventoryBatch: true,
            },
          },
          _count: { select: { items: true } },
        },
      });
    }

    // Field updates only allowed for PENDING orders
    if (order.status !== 'PENDING') {
      // Allow payment status updates for non-pending orders
      if (dto.paymentStatus && Object.keys(dto).length === 1) {
        return this.prisma.order.update({
          where: { id },
          data: { paymentStatus: dto.paymentStatus },
          include: {
            location: true,
            customer: true,
            currency: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: {
                product: true,
                inventoryBatch: true,
              },
            },
            _count: { select: { items: true } },
          },
        });
      }
      throw new BadRequestException(ErrorMessages.orders.canOnlyUpdatePending);
    }

    // Verify new location if provided
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(ErrorMessages.orders.locationNotFound);
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.orderDate && { orderDate: new Date(dto.orderDate) }),
        ...(dto.customerName && { customerName: dto.customerName }),
        ...(dto.customerEmail !== undefined && {
          customerEmail: dto.customerEmail,
        }),
        ...(dto.customerPhone !== undefined && {
          customerPhone: dto.customerPhone,
        }),
        ...(dto.shippingAddress !== undefined && {
          shippingAddress: dto.shippingAddress,
        }),
        ...(dto.shippingCity !== undefined && {
          shippingCity: dto.shippingCity,
        }),
        ...(dto.shippingPostalCode !== undefined && {
          shippingPostalCode: dto.shippingPostalCode,
        }),
        ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        ...(dto.locationId && { locationId: dto.locationId }),
        ...(dto.shippingCost !== undefined && {
          shippingCost: dto.shippingCost,
        }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        location: true,
        customer: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            inventoryBatch: true,
          },
        },
        _count: { select: { items: true } },
      },
    });
  }

  async confirm(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(ErrorMessages.orders.canOnlyConfirmPending);
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(ErrorMessages.orders.cannotConfirmWithoutItems);
    }

    // Validate stock availability and deduct inventory in a transaction
    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        // Skip inventory deduction for services
        if (!product || product.type === 'SERVICE' || !product.trackInventory) {
          continue;
        }

        const quantity = Number(item.quantity);

        if (item.inventoryBatchId) {
          // Deduct from specific batch
          const batch = await tx.inventoryBatch.findUnique({
            where: { id: item.inventoryBatchId },
          });

          if (!batch) {
            throw new BadRequestException(
              `Партидата за продукт "${product.name}" не е намерена`,
            );
          }

          if (Number(batch.quantity) < quantity) {
            throw new BadRequestException(
              `${ErrorMessages.inventory.insufficientStock}: "${product.name}" - ` +
                `налични: ${Number(batch.quantity)}, заявени: ${quantity}`,
            );
          }

          await tx.inventoryBatch.update({
            where: { id: item.inventoryBatchId },
            data: { quantity: Number(batch.quantity) - quantity },
          });
        } else {
          // Auto-deduct using FIFO (oldest batches first)
          const batches = await tx.inventoryBatch.findMany({
            where: {
              companyId,
              productId: item.productId,
              quantity: { gt: 0 },
              ...(order.locationId && { locationId: order.locationId }),
            },
            orderBy: { createdAt: 'asc' }, // FIFO
          });

          const totalAvailable = batches.reduce(
            (sum, b) => sum + Number(b.quantity),
            0,
          );

          if (totalAvailable < quantity) {
            throw new BadRequestException(
              `${ErrorMessages.inventory.insufficientStock}: "${product.name}" - ` +
                `налични: ${totalAvailable}, заявени: ${quantity}`,
            );
          }

          let remaining = quantity;
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
      }

      // Update order status
      return tx.order.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          location: true,
          customer: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              inventoryBatch: true,
            },
          },
          _count: { select: { items: true } },
        },
      });
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.orders.alreadyCancelled);
    }

    if (order.status === 'DELIVERED') {
      throw new BadRequestException(ErrorMessages.orders.cannotCancelDelivered);
    }

    // Restore inventory if order was confirmed (stock was deducted)
    const needsRestore = ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(
      order.status,
    );

    return this.prisma.$transaction(async (tx) => {
      if (needsRestore) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          // Skip for services or non-tracked products
          if (!product || product.type === 'SERVICE' || !product.trackInventory) {
            continue;
          }

          const quantity = Number(item.quantity);

          if (item.inventoryBatchId) {
            // Restore to the specific batch
            const batch = await tx.inventoryBatch.findUnique({
              where: { id: item.inventoryBatchId },
            });

            if (batch) {
              await tx.inventoryBatch.update({
                where: { id: item.inventoryBatchId },
                data: { quantity: Number(batch.quantity) + quantity },
              });
            }
          } else {
            // If no specific batch, restore to the oldest batch of this product at the order location
            const batch = await tx.inventoryBatch.findFirst({
              where: {
                companyId,
                productId: item.productId,
                ...(order.locationId && { locationId: order.locationId }),
              },
              orderBy: { createdAt: 'asc' },
            });

            if (batch) {
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: Number(batch.quantity) + quantity },
              });
            }
          }
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          location: true,
          customer: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              inventoryBatch: true,
            },
          },
          _count: { select: { items: true } },
        },
      });
    });
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(ErrorMessages.orders.canOnlyDeletePending);
    }

    await this.prisma.order.delete({ where: { id } });

    return { message: 'Поръчката е изтрита успешно' };
  }
}
