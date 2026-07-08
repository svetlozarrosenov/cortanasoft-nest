import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrdersDto,
  FulfillOrderDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';
import { WarrantiesService } from '../warranties/warranties.service';
import { PaymentsService } from '../payments/payments.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

/** Round a number to 2 decimal places to avoid floating-point drift */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const ORDER_INCLUDE = {
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
      inventorySerial: true,
      location: true,
      batchAllocations: true,
    },
  },
  acceptanceProtocols: {
    where: { status: { not: 'CANCELLED' as const } },
    select: { id: true, documentNumber: true },
  },
  creditApplication: {
    select: {
      id: true,
      status: true,
      bank: true,
      bankRef: true,
      requestedAmount: true,
      termMonths: true,
      monthlyPayment: true,
      appliedAt: true,
      decisionAt: true,
      signedAt: true,
      paidAt: true,
      cancelledAt: true,
      notes: true,
    },
  },
  _count: { select: { items: true, invoices: true } },
} as const;

type OrderForStatus = {
  acceptanceProtocols?: Array<{ id: string }>;
};

function computeDeliveryStatus(order: OrderForStatus): 'NONE' | 'FULL' {
  return (order.acceptanceProtocols?.length ?? 0) > 0 ? 'FULL' : 'NONE';
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private warrantiesService: WarrantiesService,
    private paymentsService: PaymentsService,
    private webhookDispatcher: WebhookDispatcherService,
    private pushNotifications: PushNotificationsService,
  ) {}

  private async generateOrderNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    const lastOrder = await client.order.findFirst({
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

  private calculateItemTotals(
    items: CreateOrderDto['items'],
    products: { id: string; vatRate: any }[],
    defaultVatRate: number,
  ) {
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate = item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemDiscount = item.discount ?? 0;
      const itemSubtotal = round2(item.quantity * item.unitPrice - itemDiscount);

      if (itemSubtotal < 0) {
        throw new BadRequestException(
          `Отстъпката не може да надвишава стойността на артикула`,
        );
      }

      const itemVat = round2(itemSubtotal * (itemVatRate / 100));

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
        inventorySerialId: item.inventorySerialId,
        locationId: item.locationId,
      };
    });

    return { itemsData, subtotal: round2(subtotal), vatAmount: round2(vatAmount) };
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

    // Verify all products exist (deduplicate to avoid false mismatch)
    const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException(ErrorMessages.orders.productsNotFound);
    }

    // Verify the customer belongs to this company, so a client can't attach
    // (and later read back / mutate) another tenant's customer record (IDOR).
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException('Клиентът не е намерен');
      }
    }

    // Use company currency as default
    const currencyId = dto.currencyId || company.currencyId;

    // Calculate totals with proper rounding
    const { itemsData, subtotal, vatAmount } = this.calculateItemTotals(
      dto.items,
      products,
      defaultVatRate,
    );

    const orderDiscount = dto.discount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const total = round2(subtotal + vatAmount + shippingCost - orderDiscount);

    // Generate order number inside transaction to avoid race condition
    const initialPaymentStatus =
      (dto.paymentStatus as 'PENDING' | 'PARTIAL' | 'PAID') || 'PENDING';

    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber =
        dto.orderNumber || (await this.generateOrderNumber(companyId, tx));

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          externalId: dto.externalId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
          status: 'DRAFT',
          paymentStatus: 'PENDING',
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          deliveryMethod: dto.deliveryMethod || 'none',
          shippingAddress: dto.shippingAddress,
          shippingCity: dto.shippingCity,
          shippingPostalCode: dto.shippingPostalCode,
          receiverName: dto.receiverName,
          receiverPhone: dto.receiverPhone,
          econtOfficeCode: dto.econtOfficeCode,
          econtOfficeName: dto.econtOfficeName,
          paymentMethod: dto.paymentMethod,
          shippingCost,
          discount: orderDiscount,
          subtotal,
          vatAmount,
          total,
          notes: dto.notes,
          currencyId,
          sourceOfferId: dto.sourceOfferId,
          companyId,
          locationId: dto.locationId,
          createdById: userId,
          items: {
            create: itemsData,
          },
        },
        include: ORDER_INCLUDE,
      });

      // Seed payment if integration passed a non-PENDING status
      if (initialPaymentStatus !== 'PENDING') {
        await this.paymentsService.syncPaymentsFromStatus(
          tx,
          companyId,
          createdOrder.id,
          initialPaymentStatus,
          Number(createdOrder.total),
          createdOrder.paymentMethod,
        );
      }

      return createdOrder;
    });

    // Warranties are intentionally NOT auto-created at order creation.
    // Most shop orders here are credit-financed and get cancelled when the
    // bank rejects; creating warranties up front means orphaned ACTIVE rows.
    // Warranty issuance moved to the DELIVERED status transition in update().

    // Fire-and-forget push to users whose role has notifyOnNewOrder=true.
    // Gated by Company.pushNotificationsEnabled inside sendToCompany().
    const currencyCode = order.currency?.code || '';
    this.pushNotifications
      .sendToCompany(
        companyId,
        {
          title: 'Нова поръчка',
          body: `${order.orderNumber} — ${order.customerName} (${Number(order.total).toFixed(2)} ${currencyCode})`,
          url: `/dashboard/${companyId}/erp/orders?view=${order.id}`,
          tag: `order-${order.id}`,
        },
        { onlyRolesWith: 'notifyOnNewOrder' },
      )
      .catch(() => {
        // Non-blocking: push delivery failures must not break order creation.
      });

    // Auto-confirm: deduct inventory and set to CONFIRMED
    if (dto.autoConfirm) {
      return this.confirm(companyId, order.id);
    }

    return order;
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
              ...(dateFrom && { gte: new Date(dateFrom + 'T00:00:00.000Z') }),
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
        include: ORDER_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data.map((o) => ({ ...o, deliveryStatus: computeDeliveryStatus(o) })),
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
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.orders.notFound);
    }

    return { ...order, deliveryStatus: computeDeliveryStatus(order) };
  }

  // Walk every order in an open state (not CANCELLED / DELIVERED / DRAFT)
  // and surface each OrderItem whose product is inventory-tracked but
  // hasn't yet had a serial / batch assigned. The frontend tags each row
  // RED / AMBER / GRAY based on stock availability + payment status so
  // the admin sees the queue of "ready to fulfil" sales at a glance.
  async findUnfulfilledItems(companyId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        status: { notIn: ['CANCELLED', 'DELIVERED', 'DRAFT'] },
      },
      orderBy: { orderDate: 'asc' },
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
        paymentStatus: true,
        total: true,
        paidAmount: true,
        currency: { select: { code: true } },
        customerName: true,
        customerEmail: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            inventorySerialId: true,
            inventoryBatchId: true,
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                type: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });

    // Collect every product we need to know live stock for.
    const productIds = new Set<string>();
    for (const o of orders) {
      for (const it of o.items) {
        if (it.product.trackInventory) productIds.add(it.product.id);
      }
    }

    // Build a stock map: productId → available units (IN_STOCK + unassigned)
    const stockMap = new Map<string, number>();
    if (productIds.size > 0) {
      // SERIAL products: count InventorySerial rows with status IN_STOCK
      // and no orderItem assigned.
      const serialCounts = await this.prisma.inventorySerial.groupBy({
        by: ['productId'],
        where: {
          companyId,
          productId: { in: Array.from(productIds) },
          status: 'IN_STOCK',
          orderItems: { none: {} },
        },
        _count: { _all: true },
      });
      for (const r of serialCounts) {
        stockMap.set(r.productId, r._count._all);
      }

      // BATCH / PRODUCT: sum InventoryBatch.quantity (assumes batches are
      // already net of consumed; cortana decrements on order
      // confirmation).
      const batchSums = await this.prisma.inventoryBatch.groupBy({
        by: ['productId'],
        where: {
          companyId,
          productId: { in: Array.from(productIds) },
          quantity: { gt: 0 },
        },
        _sum: { quantity: true },
      });
      for (const r of batchSums) {
        const prev = stockMap.get(r.productId) || 0;
        stockMap.set(r.productId, prev + Number(r._sum.quantity || 0));
      }
    }

    // Build one output row per OrderItem that needs allocation.
    const rows: Array<{
      orderId: string;
      orderNumber: string;
      orderDate: string;
      orderStatus: string;
      paymentStatus: string;
      total: number;
      paidAmount: number;
      currency: string | null;
      customerName: string;
      customerEmail: string | null;
      item: {
        id: string;
        productId: string;
        productName: string;
        productSku: string;
        productType: string;
        quantity: number;
        unitPrice: number;
        hasAllocation: boolean;
      };
      stockAvailable: number;
      readiness: 'ready' | 'awaiting-stock' | 'allocated' | 'no-stock-tracked';
    }> = [];

    for (const o of orders) {
      for (const it of o.items) {
        // Items whose product doesn't track inventory (services etc.)
        // don't belong in the dashboard.
        if (!it.product.trackInventory) continue;

        const hasAllocation = Boolean(it.inventorySerialId || it.inventoryBatchId);
        const stockAvailable = stockMap.get(it.product.id) || 0;

        let readiness: 'ready' | 'awaiting-stock' | 'allocated' | 'no-stock-tracked';
        if (hasAllocation) {
          readiness = 'allocated';
        } else if (stockAvailable >= Number(it.quantity)) {
          readiness = 'ready';
        } else {
          readiness = 'awaiting-stock';
        }

        // Hide already-allocated rows by default — they're not "unfulfilled".
        if (readiness === 'allocated') continue;

        rows.push({
          orderId: o.id,
          orderNumber: o.orderNumber,
          orderDate: o.orderDate.toISOString(),
          orderStatus: o.status,
          paymentStatus: o.paymentStatus,
          total: Number(o.total),
          paidAmount: Number(o.paidAmount),
          currency: o.currency?.code || null,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          item: {
            id: it.id,
            productId: it.product.id,
            productName: it.product.name,
            productSku: it.product.sku,
            productType: it.product.type,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            hasAllocation,
          },
          stockAvailable,
          readiness,
        });
      }
    }

    // Sort: "ready to ship" (red) first, then "awaiting stock" (amber),
    // each sorted by order date ascending (oldest first).
    rows.sort((a, b) => {
      if (a.readiness !== b.readiness) {
        if (a.readiness === 'ready') return -1;
        if (b.readiness === 'ready') return 1;
      }
      return a.orderDate.localeCompare(b.orderDate);
    });

    return {
      items: rows,
      summary: {
        total: rows.length,
        ready: rows.filter((r) => r.readiness === 'ready').length,
        awaitingStock: rows.filter((r) => r.readiness === 'awaiting-stock').length,
      },
    };
  }

  async update(companyId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(companyId, id);

    // Verify a reassigned customer belongs to this company (cross-tenant IDOR).
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) {
        throw new NotFoundException('Клиентът не е намерен');
      }
    }

    // Status change
    if (dto.status && dto.status !== order.status) {
      // Анулирана поръчка е терминална за директни смени: cancel() е върнал
      // стоката в склада, така че единственият валиден изход е reopen()
      // (→ PENDING), откъдето confirm() изписва наличностите наново.
      if (order.status === 'CANCELLED') {
        throw new BadRequestException(ErrorMessages.orders.cancelledUseReopen);
      }

      // „Изпратена/Доставена" означава, че стоката физически излиза → всички
      // партидни/складови редове трябва да са изписани преди това. Не можеш да
      // доставиш каквото нямаш. Серийните се обработват отделно и не блокират тук.
      if (dto.status === 'SHIPPED' || dto.status === 'DELIVERED') {
        const unfulfilled = order.items.filter(
          (it) =>
            it.product &&
            it.product.type !== 'SERVICE' &&
            it.product.type !== 'SERIAL' &&
            it.product.trackInventory &&
            !it.stockDeducted,
        );
        if (unfulfilled.length > 0) {
          throw new BadRequestException(
            'Поръчката има неизписани редове. Окомплектовайте (изберете партиди), преди да я маркирате като изпратена/доставена.',
          );
        }
      }

      // Simple status transitions (CONFIRMED→PROCESSING, PROCESSING→SHIPPED, SHIPPED→DELIVERED)
      const updated = await this.prisma.order.update({
        where: { id },
        data: { status: dto.status },
        include: ORDER_INCLUDE,
      });

      // Issue warranties on DELIVERED — this is when the customer actually
      // takes possession of the goods, so it's the correct moment to start
      // the warranty clock. createWarrantiesForOrder is idempotent.
      if (dto.status === 'DELIVERED') {
        try {
          await this.warrantiesService.createWarrantiesForOrder(companyId, id);
        } catch {
          // Non-blocking: warranty failure should not block the status flip.
        }
      }

      return updated;
    }

    // Allow payment status updates for confirmed+ orders.
    // Delegates to PaymentsService so payments history stays authoritative:
    // PAID creates a synthetic payment for the remainder, PENDING wipes auto-generated ones.
    if (order.status === 'DELIVERED') {
      if (dto.paymentStatus) {
        return this.prisma.$transaction(async (tx) => {
          if (dto.paymentStatus === 'REFUNDED') {
            await tx.order.update({
              where: { id },
              data: { paymentStatus: 'REFUNDED' },
            });
          } else {
            await this.paymentsService.syncPaymentsFromStatus(
              tx,
              companyId,
              id,
              dto.paymentStatus as 'PENDING' | 'PARTIAL' | 'PAID',
              Number(order.total),
              order.paymentMethod,
            );
          }
          return tx.order.findFirst({
            where: { id },
            include: ORDER_INCLUDE,
          });
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

    // If items are provided, recalculate totals and replace items in a transaction
    if (dto.items && dto.items.length > 0) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });
      const defaultVatRate = company?.vatNumber ? 20 : 0;

      const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: uniqueProductIds }, companyId },
      });
      if (products.length !== uniqueProductIds.length) {
        throw new BadRequestException(ErrorMessages.orders.productsNotFound);
      }

      const { itemsData, subtotal, vatAmount } = this.calculateItemTotals(
        dto.items,
        products,
        defaultVatRate,
      );

      const orderDiscount = dto.discount ?? Number(order.discount);
      const shippingCost = dto.shippingCost ?? Number(order.shippingCost);
      const total = round2(subtotal + vatAmount + shippingCost - orderDiscount);

      // Build a quick lookup so the apply step below knows each new item's
      // product type without an extra DB round-trip.
      const productById = new Map(products.map((p) => [p.id, p]));

      const updated = await this.prisma.$transaction(async (tx) => {
        // 1. Revert inventory side effects of items that previously consumed
        //    stock. Mirrors cancel()'s restore logic so update() is reversible.
        //    Without this, replacing an item silently leaves the old serial as
        //    SOLD or the old batch decremented forever.
        for (const oldItem of order.items) {
          if (!oldItem.stockDeducted) continue;
          const oldProduct = oldItem.product;
          if (
            !oldProduct ||
            oldProduct.type === 'SERVICE' ||
            !oldProduct.trackInventory
          ) {
            continue;
          }

          if (oldProduct.type === 'SERIAL' && oldItem.inventorySerialId) {
            await tx.inventorySerial.update({
              where: { id: oldItem.inventorySerialId },
              data: { status: 'IN_STOCK' },
            });
            continue;
          }

          const oldQty = Number(oldItem.quantity);
          // Ново: ако имаме точни разпределения по партиди, връщаме по тях
          // (важно е да стане ПРЕДИ deleteMany, който каскадно ги трие).
          const restoredByAllocations = await this.restoreBatchAllocations(
            tx,
            oldItem.id,
          );
          if (restoredByAllocations) {
            continue;
          }
          if (oldItem.inventoryBatchId) {
            await tx.inventoryBatch.update({
              where: { id: oldItem.inventoryBatchId },
              data: { quantity: { increment: oldQty } },
            });
          } else {
            // FIFO-deducted at confirm time — restore to oldest batch at the
            // item/order location, same fallback cancel() uses.
            const restoreLocationId = oldItem.locationId || order.locationId;
            const batch = await tx.inventoryBatch.findFirst({
              where: {
                companyId,
                productId: oldItem.productId,
                ...(restoreLocationId && { locationId: restoreLocationId }),
              },
              orderBy: { createdAt: 'asc' },
            });
            if (batch) {
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: { increment: oldQty } },
              });
            }
          }
        }

        // 2. Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        // 3. Update order + recreate items
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            ...(dto.orderDate && { orderDate: new Date(dto.orderDate) }),
            ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
            ...(dto.customerName && { customerName: dto.customerName }),
            ...(dto.customerEmail !== undefined && { customerEmail: dto.customerEmail }),
            ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone }),
            ...(dto.deliveryMethod !== undefined && { deliveryMethod: dto.deliveryMethod }),
            ...(dto.shippingAddress !== undefined && { shippingAddress: dto.shippingAddress }),
            ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
            ...(dto.shippingPostalCode !== undefined && { shippingPostalCode: dto.shippingPostalCode }),
            ...(dto.receiverName !== undefined && { receiverName: dto.receiverName }),
            ...(dto.receiverPhone !== undefined && { receiverPhone: dto.receiverPhone }),
            ...(dto.econtOfficeCode !== undefined && { econtOfficeCode: dto.econtOfficeCode }),
            ...(dto.econtOfficeName !== undefined && { econtOfficeName: dto.econtOfficeName }),
            ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
            ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
            ...(dto.locationId && { locationId: dto.locationId }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            shippingCost,
            discount: orderDiscount,
            subtotal,
            vatAmount,
            total,
            items: {
              create: itemsData,
            },
          },
          include: ORDER_INCLUDE,
        });

        // 4. Apply inventory deduction for new items that carry an explicit
        //    allocation (inventorySerialId / inventoryBatchId). Items without
        //    allocation stay as backorder. Mirrors confirm()'s SERIAL/BATCH
        //    branches; FIFO auto-allocation is intentionally NOT done here —
        //    that's confirm()'s responsibility, not update()'s.
        for (const newItem of updatedOrder.items) {
          const newProduct = productById.get(newItem.productId);
          if (
            !newProduct ||
            newProduct.type === 'SERVICE' ||
            !newProduct.trackInventory
          ) {
            continue;
          }

          if (newProduct.type === 'SERIAL') {
            if (!newItem.inventorySerialId) continue;
            const serial = await tx.inventorySerial.findFirst({
              where: {
                id: newItem.inventorySerialId,
                companyId,
                productId: newItem.productId,
              },
            });
            if (!serial) {
              throw new BadRequestException(
                ErrorMessages.inventory.serialNotFound,
              );
            }
            if (serial.status !== 'IN_STOCK') {
              throw new BadRequestException(
                `${ErrorMessages.inventory.serialNotInStock}: "${newProduct.name}" - SN: ${serial.serialNumber}`,
              );
            }
            await tx.inventorySerial.update({
              where: { id: newItem.inventorySerialId },
              data: { status: 'SOLD' },
            });
            await tx.orderItem.update({
              where: { id: newItem.id },
              data: { stockDeducted: true },
            });
            continue;
          }

          if (newItem.inventoryBatchId) {
            const newQty = Number(newItem.quantity);
            // Scope by companyId + productId to prevent cross-tenant batch IDOR.
            const batch = await tx.inventoryBatch.findFirst({
              where: {
                id: newItem.inventoryBatchId,
                companyId,
                productId: newItem.productId,
              },
            });
            if (!batch) {
              throw new BadRequestException(
                `Партидата за продукт "${newProduct.name}" не е намерена`,
              );
            }
            if (Number(batch.quantity) < newQty) {
              throw new BadRequestException(
                `${ErrorMessages.inventory.insufficientStock}: "${newProduct.name}" - ` +
                  `налични: ${Number(batch.quantity)}, заявени: ${newQty}`,
              );
            }
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { quantity: { decrement: newQty } },
            });
            await tx.orderItem.update({
              where: { id: newItem.id },
              data: { stockDeducted: true },
            });
            await this.createBatchAllocations(tx, newItem.id, [
              {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                quantity: newQty,
              },
            ]);
          }
        }

        // Re-fetch so stockDeducted updates land in the returned payload.
        return tx.order.findFirst({
          where: { id },
          include: ORDER_INCLUDE,
        });
      });
      await this.webhookDispatcher.emitOrderChanged(companyId, id);
      return updated;
    }

    // Update metadata only (no items change)
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.orderDate && { orderDate: new Date(dto.orderDate) }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.customerName && { customerName: dto.customerName }),
        ...(dto.customerEmail !== undefined && { customerEmail: dto.customerEmail }),
        ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone }),
        ...(dto.deliveryMethod !== undefined && { deliveryMethod: dto.deliveryMethod }),
        ...(dto.shippingAddress !== undefined && { shippingAddress: dto.shippingAddress }),
        ...(dto.shippingCity !== undefined && { shippingCity: dto.shippingCity }),
        ...(dto.shippingPostalCode !== undefined && { shippingPostalCode: dto.shippingPostalCode }),
        ...(dto.receiverName !== undefined && { receiverName: dto.receiverName }),
        ...(dto.receiverPhone !== undefined && { receiverPhone: dto.receiverPhone }),
        ...(dto.econtOfficeCode !== undefined && { econtOfficeCode: dto.econtOfficeCode }),
        ...(dto.econtOfficeName !== undefined && { econtOfficeName: dto.econtOfficeName }),
        ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
        ...(dto.locationId && { locationId: dto.locationId }),
        ...(dto.shippingCost !== undefined && { shippingCost: dto.shippingCost }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: ORDER_INCLUDE,
    });
    await this.webhookDispatcher.emitOrderChanged(companyId, id);
    return updated;
  }

  // Записва от кои партиди (и по колко) е изписан даден ред — за проследимост
  // и за експедиционния лист. Извиква се при всяко изписване на BATCH продукт.
  private async createBatchAllocations(
    tx: Prisma.TransactionClient,
    orderItemId: string,
    allocations: { batchId: string; batchNumber: string; quantity: number }[],
  ) {
    if (allocations.length === 0) return;
    await tx.orderItemBatchAllocation.createMany({
      data: allocations.map((a) => ({
        orderItemId,
        inventoryBatchId: a.batchId,
        batchNumber: a.batchNumber,
        quantity: a.quantity,
      })),
    });
  }

  // Връща наличността точно по записаните разпределения и ги изтрива. Връща
  // true, ако е намерил разпределения (нова логика). За стари поръчки без
  // разпределения връща false и викащият пада към старото възстановяване.
  private async restoreBatchAllocations(
    tx: Prisma.TransactionClient,
    orderItemId: string,
  ): Promise<boolean> {
    const allocations = await tx.orderItemBatchAllocation.findMany({
      where: { orderItemId },
    });
    if (allocations.length === 0) return false;
    for (const alloc of allocations) {
      if (alloc.inventoryBatchId) {
        // updateMany не хвърля, ако партидата вече не съществува (SetNull)
        await tx.inventoryBatch.updateMany({
          where: { id: alloc.inventoryBatchId },
          data: { quantity: { increment: Number(alloc.quantity) } },
        });
      }
    }
    await tx.orderItemBatchAllocation.deleteMany({ where: { orderItemId } });
    return true;
  }

  // Връща плана за окомплектоване: за всеки неизписан партиден ред — наличните
  // партиди (FEFO подредени) + предложено разпределение. Серийните и
  // непроследимите редове се прескачат (обработват се другаде).
  async getFulfillmentPlan(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    const lines: Array<{
      orderItemId: string;
      productId: string;
      productName: string;
      unit: string;
      quantity: number;
      totalAvailable: number;
      availableBatches: Array<{
        id: string;
        batchNumber: string;
        quantity: number;
        expiryDate: Date | null;
        locationName: string | null;
      }>;
      suggested: Array<{ inventoryBatchId: string; quantity: number }>;
    }> = [];

    for (const item of order.items) {
      const product = item.product;
      if (
        !product ||
        product.type === 'SERVICE' ||
        product.type === 'SERIAL' ||
        !product.trackInventory ||
        item.stockDeducted
      ) {
        continue;
      }

      const locId = item.locationId || order.locationId;
      const batches = await this.prisma.inventoryBatch.findMany({
        where: {
          companyId,
          productId: item.productId,
          quantity: { gt: 0 },
          ...(locId && { locationId: locId }),
        },
        orderBy: [
          { expiryDate: { sort: 'asc', nulls: 'last' } },
          { createdAt: 'asc' },
        ],
        include: { location: { select: { name: true } } },
      });

      // FEFO предложение до количеството на реда
      let remaining = Number(item.quantity);
      const suggested: Array<{ inventoryBatchId: string; quantity: number }> = [];
      for (const b of batches) {
        if (remaining <= 0) break;
        const take = Math.min(Number(b.quantity), remaining);
        suggested.push({ inventoryBatchId: b.id, quantity: round2(take) });
        remaining -= take;
      }

      lines.push({
        orderItemId: item.id,
        productId: item.productId,
        productName: product.name,
        unit: product.unit,
        quantity: Number(item.quantity),
        totalAvailable: round2(
          batches.reduce((s, b) => s + Number(b.quantity), 0),
        ),
        availableBatches: batches.map((b) => ({
          id: b.id,
          batchNumber: b.batchNumber,
          quantity: Number(b.quantity),
          expiryDate: b.expiryDate,
          locationName: b.location?.name ?? null,
        })),
        suggested,
      });
    }

    return { orderId: id, lines };
  }

  // Окомплектоване/изписване: изписва посочените редове от избраните партиди,
  // записва разпределенията и маркира редовете като изписани. Сумата на
  // избраните партиди по ред трябва да е точно количеството на реда.
  async fulfill(companyId: string, id: string, dto: FulfillOrderDto) {
    const order = await this.findOne(companyId, id);

    const result = await this.prisma.$transaction(async (tx) => {
      for (const lineAlloc of dto.items) {
        const item = order.items.find((i) => i.id === lineAlloc.orderItemId);
        if (!item) {
          throw new BadRequestException('Невалиден ред в поръчката');
        }
        if (item.stockDeducted) continue; // вече е изписан

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.type === 'SERVICE' || !product.trackInventory) {
          continue;
        }
        if (product.type === 'SERIAL') {
          throw new BadRequestException(
            `Серийните продукти се изписват чрез избор на сериен номер: "${product.name}"`,
          );
        }

        const sum = lineAlloc.batches.reduce(
          (s, b) => s + Number(b.quantity),
          0,
        );
        if (round2(sum) !== round2(Number(item.quantity))) {
          throw new BadRequestException(
            `Сумата на избраните партиди (${round2(sum)}) трябва да е ${Number(
              item.quantity,
            )} за "${product.name}"`,
          );
        }

        const consumed: {
          batchId: string;
          batchNumber: string;
          quantity: number;
        }[] = [];
        for (const b of lineAlloc.batches) {
          if (Number(b.quantity) <= 0) continue;
          const batch = await tx.inventoryBatch.findFirst({
            where: {
              id: b.inventoryBatchId,
              companyId,
              productId: item.productId,
            },
          });
          if (!batch) {
            throw new BadRequestException(
              `Партидата за "${product.name}" не е намерена`,
            );
          }
          if (Number(batch.quantity) < Number(b.quantity)) {
            throw new BadRequestException(
              `Партида ${batch.batchNumber}: налични ${Number(
                batch.quantity,
              )}, заявени ${Number(b.quantity)}`,
            );
          }
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: Number(b.quantity) } },
          });
          consumed.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: Number(b.quantity),
          });
        }

        await tx.orderItem.update({
          where: { id: item.id },
          data: { stockDeducted: true },
        });
        await this.createBatchAllocations(tx, item.id, consumed);
      }

      return tx.order.findFirst({ where: { id }, include: ORDER_INCLUDE });
    });

    await this.webhookDispatcher.emitOrderChanged(companyId, id);
    return result;
  }

  async confirm(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'DRAFT' && order.status !== 'PENDING' && order.status !== 'PROCESSING') {
      throw new BadRequestException(ErrorMessages.orders.canOnlyConfirmPending);
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(ErrorMessages.orders.cannotConfirmWithoutItems);
    }

    // Deduct inventory where possible; items without stock/serial become
    // backorders (stockDeducted=false) and stay listed in the "Awaiting
    // fulfilment" dashboard until stock arrives. The order still becomes
    // CONFIRMED so the user can collect payment and issue invoices.
    const result = await this.prisma.$transaction(
      async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          // Skip inventory deduction for services
          if (!product || product.type === 'SERVICE' || !product.trackInventory) {
            continue;
          }

          // Handle SERIAL products
          if (product.type === 'SERIAL') {
            if (!item.inventorySerialId) {
              // Backorder: no serial assigned yet. Leave stockDeducted=false
              // so cancel() won't restore something that was never deducted.
              await tx.orderItem.update({
                where: { id: item.id },
                data: { stockDeducted: false },
              });
              continue;
            }

            const serial = await tx.inventorySerial.findFirst({
              where: {
                id: item.inventorySerialId,
                companyId,
                productId: item.productId,
              },
            });

            if (!serial) {
              throw new BadRequestException(
                ErrorMessages.inventory.serialNotFound,
              );
            }

            if (serial.status !== 'IN_STOCK') {
              throw new BadRequestException(
                `${ErrorMessages.inventory.serialNotInStock}: "${product.name}" - SN: ${serial.serialNumber}`,
              );
            }

            await tx.inventorySerial.update({
              where: { id: item.inventorySerialId },
              data: { status: 'SOLD' },
            });
            await tx.orderItem.update({
              where: { id: item.id },
              data: { stockDeducted: true },
            });

            continue;
          }

          const quantity = Number(item.quantity);

          if (item.inventoryBatchId) {
            // Deduct from specific batch using atomic decrement.
            // Scope by companyId + productId so a client can't pass another
            // tenant's batch id and decrement their stock (IDOR).
            const batch = await tx.inventoryBatch.findFirst({
              where: {
                id: item.inventoryBatchId,
                companyId,
                productId: item.productId,
              },
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
              data: { quantity: { decrement: quantity } },
            });
            await tx.orderItem.update({
              where: { id: item.id },
              data: { stockDeducted: true },
            });
            await this.createBatchAllocations(tx, item.id, [
              {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                quantity,
              },
            ]);
          } else {
            // Auto-deduct using FEFO (first-expired-first-out) — за стоки със
            // срок излиза първо най-скоро изтичащата; без срок → най-старата (FIFO).
            // Prefer item-level locationId, fall back to order-level
            const deductLocationId = item.locationId || order.locationId;
            const batches = await tx.inventoryBatch.findMany({
              where: {
                companyId,
                productId: item.productId,
                quantity: { gt: 0 },
                ...(deductLocationId && { locationId: deductLocationId }),
              },
              orderBy: [
                { expiryDate: { sort: 'asc', nulls: 'last' } },
                { createdAt: 'asc' },
              ], // FEFO, после FIFO
            });

            const totalAvailable = batches.reduce(
              (sum, b) => sum + Number(b.quantity),
              0,
            );

            if (totalAvailable < quantity) {
              // Backorder: insufficient stock. Skip deduction; the row stays
              // in "Awaiting fulfilment" until a goods receipt arrives.
              await tx.orderItem.update({
                where: { id: item.id },
                data: { stockDeducted: false },
              });
              continue;
            }

            let remaining = quantity;
            const consumed: {
              batchId: string;
              batchNumber: string;
              quantity: number;
            }[] = [];
            for (const batch of batches) {
              if (remaining <= 0) break;

              const batchQty = Number(batch.quantity);
              const deduct = Math.min(batchQty, remaining);

              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: { decrement: deduct } },
              });
              consumed.push({
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                quantity: deduct,
              });

              remaining -= deduct;
            }
            await tx.orderItem.update({
              where: { id: item.id },
              data: { stockDeducted: true },
            });
            await this.createBatchAllocations(tx, item.id, consumed);
          }
        }

        // Update order status
        return tx.order.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include: ORDER_INCLUDE,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.webhookDispatcher.emitOrderChanged(companyId, id);
    return result;
  }

  // Издава експедиционен лист — маркира поръчката, че листът е изваден.
  // Идемпотентно: издава се само веднъж; повторно "издаване" връща поръчката
  // непроменена (запазва оригиналния момент), а UI-ят просто препечатва PDF-а.
  // Разрешено е във всички статуси на поръчката.
  async issueExpedition(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);
    if (order.expeditionIssuedAt) {
      return order;
    }
    return this.prisma.order.update({
      where: { id },
      data: { expeditionIssuedAt: new Date() },
      include: ORDER_INCLUDE,
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

    const result = await this.prisma.$transaction(async (tx) => {
      if (needsRestore) {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          // Skip for services or non-tracked products
          if (!product || product.type === 'SERVICE' || !product.trackInventory) {
            continue;
          }

          // Backorder items never had their stock decremented at confirm — nothing to restore.
          if (!item.stockDeducted) {
            continue;
          }

          // Restore SERIAL products
          if (product.type === 'SERIAL' && item.inventorySerialId) {
            await tx.inventorySerial.update({
              where: { id: item.inventorySerialId },
              data: { status: 'IN_STOCK' },
            });
            await tx.orderItem.update({
              where: { id: item.id },
              data: { stockDeducted: false },
            });
            continue;
          }

          const quantity = Number(item.quantity);

          // Ново: ако имаме точни разпределения по партиди — връщаме по тях.
          const restoredByAllocations = await this.restoreBatchAllocations(
            tx,
            item.id,
          );
          if (restoredByAllocations) {
            // нищо повече — разпределенията върнаха точните количества
          } else if (item.inventoryBatchId) {
            // Restore to the specific batch using atomic increment
            await tx.inventoryBatch.update({
              where: { id: item.inventoryBatchId },
              data: { quantity: { increment: quantity } },
            });
          } else {
            // If no specific batch, restore to the oldest batch of this product at the item/order location
            const restoreLocationId = item.locationId || order.locationId;
            const batch = await tx.inventoryBatch.findFirst({
              where: {
                companyId,
                productId: item.productId,
                ...(restoreLocationId && { locationId: restoreLocationId }),
              },
              orderBy: { createdAt: 'asc' },
            });

            if (batch) {
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: { increment: quantity } },
              });
            }
          }
          await tx.orderItem.update({
            where: { id: item.id },
            data: { stockDeducted: false },
          });
        }
      }

      // Void any warranties this order had issued. After today only DELIVERED
      // orders get warranties, so usually nothing to void; the cascade exists
      // so legacy CONFIRMED-with-warranty orders are also cleaned up the
      // moment they are cancelled.
      await this.warrantiesService.voidWarrantiesForOrder(companyId, id, tx);

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: ORDER_INCLUDE,
      });
    });
    await this.webhookDispatcher.emitOrderChanged(companyId, id);
    return result;
  }

  // Възстановява грешно анулирана поръчка: CANCELLED → PENDING. Не пипа
  // склада — cancel() вече е върнал количествата, а повторното изписване
  // става по нормалния път при confirm() (с всички проверки за наличност).
  // Гаранциите не се възстановяват (издават се наново при DELIVERED).
  async reopen(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'CANCELLED') {
      throw new BadRequestException(
        ErrorMessages.orders.canOnlyReopenCancelled,
      );
    }

    const result = await this.prisma.order.update({
      where: { id },
      data: { status: 'PENDING' },
      include: ORDER_INCLUDE,
    });
    await this.webhookDispatcher.emitOrderChanged(companyId, id);
    return result;
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
      throw new BadRequestException(ErrorMessages.orders.canOnlyDeletePending);
    }

    await this.prisma.order.delete({ where: { id } });

    return { message: 'Поръчката е изтрита успешно' };
  }
}
