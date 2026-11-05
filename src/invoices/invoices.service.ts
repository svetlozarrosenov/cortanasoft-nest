import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoiceDto,
  CreateAdvanceInvoiceDto,
  CreateFinalInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
  CorrectInvoiceDto,
} from './dto';
import { Prisma, InvoiceStatus, InvoiceType, OrderStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';
import { PaymentsService } from '../payments/payments.service';
import { isCoveringInvoice, orderInvoicesDiffer } from './invoice-order-diff';

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  // Издаването работи и вътре в чужда транзакция (виж correct()): подадено tx
  // се ползва директно, иначе се отваря нова.
  private runInTx<T>(
    tx: Prisma.TransactionClient | undefined,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return tx ? fn(tx) : this.prisma.$transaction(fn);
  }

  // Една обща номерация за всички фактури на компанията (обикновени, авансови,
  // окончателни): последният номер + 1, 10 цифри с водещи нули.
  private async generateInvoiceNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const db = tx || this.prisma;
    const last = await db.invoice.findFirst({
      where: { companyId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let next: number;
    if (last) {
      const lastNum = parseInt(last.invoiceNumber, 10);
      next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    } else {
      // Първа фактура: номерът, зададен за компанията в Администрация (по подразбиране 1)
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { invoiceDefaultStartNumber: true },
      });
      next = company?.invoiceDefaultStartNumber ?? 1;
    }
    return next.toString().padStart(10, '0');
  }

  private readonly invoiceInclude = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
        subtotal: true,
        vatAmount: true,
        total: true,
      },
    },
    customer: true,
    currency: true,
    createdBy: {
      select: { id: true, firstName: true, lastName: true },
    },
    items: {
      include: {
        product: {
          select: { id: true, sku: true, name: true, unit: true },
        },
        orderItem: true,
      },
    },
    advanceDeductions: {
      include: {
        advanceInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            subtotal: true,
            vatAmount: true,
            total: true,
          },
        },
      },
    },
    _count: { select: { items: true } },
  };

  // Кой стои на фактурата (bill-to). Приоритет: изричен override от диалога
  // (dto.billToCustomerId) → полето „Фактурирай на" върху поръчката
  // (order.billToCustomerId) → клиентът/данните по поръчката (запазено старо
  // поведение: доставният адрес има приоритет). При bill-to клиент се вземат
  // изцяло данните на CRM записа, вкл. неговият адрес: фактурният получател е
  // различен субект от получателя на стоката, затова доставните данни на
  // поръчката не се смесват.
  private async resolveBillTo(
    companyId: string,
    order: {
      customerId: string | null;
      customerName: string;
      billToCustomerId?: string | null;
      shippingAddress: string | null;
      shippingCity: string | null;
      shippingPostalCode: string | null;
      customer: {
        eik: string | null;
        vatNumber: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
      } | null;
    },
    billToOverrideId?: string,
  ) {
    const billToCustomerId = billToOverrideId || order.billToCustomerId;
    if (billToCustomerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: billToCustomerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.invoices.billToCustomerNotFound);
      }
      const name =
        customer.type === 'COMPANY'
          ? customer.companyName
          : [customer.firstName, customer.lastName].filter(Boolean).join(' ');
      return {
        customerId: customer.id,
        customerName: name || order.customerName,
        customerEik: customer.eik,
        customerVatNumber: customer.vatNumber,
        customerAddress: customer.address,
        customerCity: customer.city,
        customerPostalCode: customer.postalCode,
      };
    }

    return {
      customerId: order.customerId,
      customerName: order.customerName,
      customerEik: order.customer?.eik ?? null,
      customerVatNumber: order.customer?.vatNumber ?? null,
      customerAddress: order.shippingAddress || order.customer?.address || null,
      customerCity: order.shippingCity || order.customer?.city || null,
      customerPostalCode:
        order.shippingPostalCode || order.customer?.postalCode || null,
    };
  }

  async createFromOrder(
    companyId: string,
    userId: string,
    dto: CreateInvoiceDto,
    outerTx?: Prisma.TransactionClient,
  ) {
    const db: Db = outerTx ?? this.prisma;
    // Find order with all data
    const order = await db.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: {
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(ErrorMessages.invoices.orderNotFound);
    }

    // Validate order status - must be at least CONFIRMED
    const allowedStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyCreateFromConfirmed);
    }

    // Bill-to: клиентът по поръчката или изрично избран друг получател
    const billTo = await this.resolveBillTo(companyId, order, dto.billToCustomerId);

    // Block REGULAR creation if there are unresolved ADVANCE invoices on this order
    const activeAdvances = await db.invoice.count({
      where: {
        companyId,
        orderId: order.id,
        type: 'ADVANCE',
        status: { not: 'CANCELLED' },
      },
    });
    if (activeAdvances > 0) {
      throw new BadRequestException(ErrorMessages.invoices.cannotMixRegularWithAdvance);
    }

    // Partial invoicing: compute remainder, validate requested amount
    const orderTotal = Number(order.total);
    const alreadyInvoiced = Number(order.invoicedAmount);
    const remainder = Math.max(0, orderTotal - alreadyInvoiced);

    if (remainder < 0.01) {
      throw new BadRequestException(ErrorMessages.invoices.orderFullyInvoiced);
    }

    const EPSILON = 0.01;
    const requestedAmount = dto.amount !== undefined ? Number(dto.amount) : remainder;

    if (requestedAmount <= 0) {
      throw new BadRequestException(ErrorMessages.invoices.invalidInvoiceAmount);
    }
    if (requestedAmount > remainder + EPSILON) {
      throw new BadRequestException(ErrorMessages.invoices.amountExceedsRemainder);
    }
    // Обикновена фактура за произволна част от сумата няма данъчно събитие
    // (ЗДДС чл. 25): нито доставка, нито получен аванс. Затова REGULAR покрива
    // целия нефактуриран остатък; парите преди доставка минават като ADVANCE.
    if (Math.abs(requestedAmount - remainder) > EPSILON) {
      throw new BadRequestException(ErrorMessages.invoices.regularMustCoverRemainder);
    }

    const isFullFirstInvoice =
      alreadyInvoiced === 0 && Math.abs(requestedAmount - orderTotal) < EPSILON;

    // Pro-rata split: scale order's subtotal/vat/discount by ratio
    const ratio = orderTotal > 0 ? requestedAmount / orderTotal : 0;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const partialSubtotal = round2(Number(order.subtotal) * ratio);
    const partialVatAmount = round2(Number(order.vatAmount) * ratio);
    const partialDiscount = round2(Number(order.discount) * ratio);
    // Effective VAT rate for the synthetic line item (guard /0)
    const effectiveVatRate = Number(order.subtotal) > 0
      ? round2((Number(order.vatAmount) / Number(order.subtotal)) * 100)
      : 0;

    // Generate number + create in a transaction to prevent duplicates
    return this.runInTx(outerTx, async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, tx);

      const orderPaid = Number(order.paidAmount);
      // Pro-rata allocated paid amount for this slice (FIFO: each invoice claims up to its own total)
      const invoiceAllocatedPaid = Math.max(
        0,
        Math.min(requestedAmount, orderPaid - alreadyInvoiced),
      );
      const invoiceStatus: InvoiceStatus =
        invoiceAllocatedPaid >= requestedAmount - EPSILON ? 'PAID'
        : invoiceAllocatedPaid > 0 ? 'PARTIALLY_PAID'
        : 'ISSUED';

      const items = isFullFirstInvoice
        ? order.items.map((item) => ({
            productId: item.productId,
            description: item.description || item.product?.name || 'Артикул',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount,
            total: item.subtotal,
            orderItemId: item.id,
          }))
        : [
            {
              description: `Фактуриране по поръчка ${order.orderNumber}`,
              quantity: 1,
              unitPrice: partialSubtotal,
              vatRate: effectiveVatRate,
              discount: 0,
              total: partialSubtotal,
            },
          ];

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'REGULAR',
          status: invoiceStatus,
          paidAmount: invoiceAllocatedPaid,
          orderId: order.id,
          ...billTo,
          subtotal: isFullFirstInvoice ? order.subtotal : partialSubtotal,
          vatAmount: isFullFirstInvoice ? order.vatAmount : partialVatAmount,
          discount: isFullFirstInvoice ? order.discount : partialDiscount,
          total: requestedAmount,
          paymentMethod: dto.paymentMethod || order.paymentMethod,
          notes: dto.notes,
          companyId,
          createdById: userId,
          items: { create: items },
        },
        include: this.invoiceInclude,
      });

      // Increment cached invoicedAmount on order
      await tx.order.update({
        where: { id: order.id },
        data: { invoicedAmount: alreadyInvoiced + requestedAmount },
      });

      return invoice;
    });
  }

  // Authoritative VAT rate for an order: derived from order totals (handles mixed VAT)
  private effectiveVatRateForOrder(order: { subtotal: any; vatAmount: any }): number {
    const subtotal = Number(order.subtotal);
    if (subtotal <= 0) return 0;
    return Math.round((Number(order.vatAmount) / subtotal) * 10000) / 100;
  }

  async createAdvance(
    companyId: string,
    userId: string,
    dto: CreateAdvanceInvoiceDto,
    outerTx?: Prisma.TransactionClient,
  ) {
    const db: Db = outerTx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: { customer: true },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.invoices.orderNotFound);
    }

    const allowedStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyCreateFromConfirmed);
    }

    // Block advance if there are already non-cancelled REGULAR/FINAL invoices
    const conflictingInvoices = await db.invoice.count({
      where: {
        companyId,
        orderId: order.id,
        type: { in: ['REGULAR', 'FINAL'] },
        status: { not: 'CANCELLED' },
      },
    });
    if (conflictingInvoices > 0) {
      throw new BadRequestException(ErrorMessages.invoices.cannotMixAdvanceWithRegular);
    }

    const requestedAmount = Number(dto.amount);
    if (requestedAmount <= 0) {
      throw new BadRequestException(ErrorMessages.invoices.invalidInvoiceAmount);
    }

    // Cap by order total minus already-issued advances (non-cancelled)
    const orderTotal = Number(order.total);
    const alreadyAdvanced = Number(order.advancedAmount);
    const advanceRemainder = Math.max(0, orderTotal - alreadyAdvanced);
    const EPSILON = 0.01;
    if (requestedAmount > advanceRemainder + EPSILON) {
      throw new BadRequestException(ErrorMessages.invoices.advanceExceedsOrder);
    }

    // Bill-to: клиентът по поръчката или изрично избран друг получател
    const billTo = await this.resolveBillTo(companyId, order, dto.billToCustomerId);

    // Pro-rata split based on order's VAT structure
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const ratio = orderTotal > 0 ? requestedAmount / orderTotal : 0;
    const partialSubtotal = round2(Number(order.subtotal) * ratio);
    const partialVatAmount = round2(Number(order.vatAmount) * ratio);
    const effectiveVatRate = this.effectiveVatRateForOrder(order);

    const created = await this.runInTx(outerTx, async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'ADVANCE',
          status: 'ISSUED',
          paidAmount: 0,
          orderId: order.id,
          ...billTo,
          subtotal: partialSubtotal,
          vatAmount: partialVatAmount,
          discount: 0,
          total: requestedAmount,
          paymentMethod: dto.paymentMethod || order.paymentMethod,
          notes: dto.notes,
          companyId,
          createdById: userId,
          items: {
            create: [
              {
                description: dto.itemDescription?.trim()
                  || `Авансово плащане по поръчка ${order.orderNumber}`,
                quantity: 1,
                unitPrice: partialSubtotal,
                vatRate: effectiveVatRate,
                discount: 0,
                total: partialSubtotal,
              },
            ],
          },
        },
        include: this.invoiceInclude,
      });

      // Track advance pool on the order (does NOT touch invoicedAmount)
      await tx.order.update({
        where: { id: order.id },
        data: { advancedAmount: alreadyAdvanced + requestedAmount },
      });

      // Авансът не създава плащане — парите са отделен факт със своя дата и
      // начин. Но вече записаните по продажбата плащания се разпределят
      // FIFO по фактурите, така че аванс след въведено плащане излиза платен.
      await this.paymentsService.recalculateOrderState(tx, order.id);

      return invoice;
    });

    // Re-fetch after transaction — recalculateOrderState mutated paidAmount/status.
    return this.findOneWith(db, companyId, created.id);
  }

  async createFinal(
    companyId: string,
    userId: string,
    dto: CreateFinalInvoiceDto,
    outerTx?: Prisma.TransactionClient,
  ) {
    const db: Db = outerTx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.invoices.orderNotFound);
    }

    const allowedStatuses: OrderStatus[] = [
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyCreateFromConfirmed);
    }

    if (Number(order.invoicedAmount) >= Number(order.total) - 0.01) {
      throw new BadRequestException(ErrorMessages.invoices.orderFullyInvoiced);
    }

    if (!dto.advanceInvoiceIds || dto.advanceInvoiceIds.length === 0) {
      throw new BadRequestException(ErrorMessages.invoices.finalRequiresAdvances);
    }

    // Приспадане се брои само в активна окончателна: анулирана (напр. при
    // „Коригирай“) освобождава аванса за ново приспадане.
    const advances = await db.invoice.findMany({
      where: {
        id: { in: dto.advanceInvoiceIds },
        companyId,
      },
      include: {
        deductedInFinals: {
          where: { finalInvoice: { status: { not: 'CANCELLED' } } },
        },
      },
    });

    if (advances.length !== dto.advanceInvoiceIds.length) {
      throw new BadRequestException(ErrorMessages.invoices.advanceNotFound);
    }

    for (const adv of advances) {
      if (adv.type !== 'ADVANCE') {
        throw new BadRequestException(ErrorMessages.invoices.notAnAdvanceInvoice);
      }
      if (adv.orderId !== order.id) {
        throw new BadRequestException(ErrorMessages.invoices.advanceNotOnOrder);
      }
      if (adv.status === 'CANCELLED') {
        throw new BadRequestException(ErrorMessages.invoices.advanceCancelled);
      }
      if (adv.deductedInFinals.length > 0) {
        throw new BadRequestException(ErrorMessages.invoices.advanceAlreadyDeducted);
      }
    }

    const orderTotal = Number(order.total);
    const orderSubtotal = Number(order.subtotal);
    const orderVat = Number(order.vatAmount);
    const orderDiscount = Number(order.discount);

    const deductionSubtotal = advances.reduce((s, a) => s + Number(a.subtotal), 0);
    const deductionVat = advances.reduce((s, a) => s + Number(a.vatAmount), 0);
    const deductionTotal = advances.reduce((s, a) => s + Number(a.total), 0);

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const finalSubtotal = round2(orderSubtotal - deductionSubtotal);
    const finalVat = round2(orderVat - deductionVat);
    const finalTotal = round2(orderTotal - deductionTotal);

    if (finalTotal < -0.01) {
      throw new BadRequestException(ErrorMessages.invoices.deductionsExceedOrder);
    }

    // Bill-to: клиентът по поръчката или изрично избран друг получател
    const billTo = await this.resolveBillTo(companyId, order, dto.billToCustomerId);

    const effectiveVatRate = this.effectiveVatRateForOrder(order);

    // Order line items + one negative line per advance deducted
    const orderLineItems = order.items.map((item) => ({
      productId: item.productId,
      description: item.description || item.product?.name || 'Артикул',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      total: item.subtotal,
      orderItemId: item.id,
    }));

    const deductionTemplate = dto.deductionDescriptionTemplate?.trim();
    const deductionLineItems = advances.map((adv) => ({
      description: deductionTemplate
        ? deductionTemplate.replace(/\{invoiceNumber\}/g, adv.invoiceNumber)
        : `Приспадане на авансово плащане по фактура ${adv.invoiceNumber}`,
      quantity: 1,
      unitPrice: -Number(adv.subtotal),
      vatRate: effectiveVatRate,
      discount: 0,
      total: -Number(adv.subtotal),
    }));

    const created = await this.runInTx(outerTx, async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, tx);

      // Inherit paid amount from advances (they're already paid in real money)
      const inheritedPaid = advances.reduce(
        (s, a) => s + Math.min(Number(a.paidAmount), Number(a.total)),
        0,
      );
      // Cap inherited paid by deductionTotal (we can't credit more than what's deducted)
      const allocatedPaid = Math.min(inheritedPaid, deductionTotal);
      const EPSILON = 0.01;
      let finalStatus: InvoiceStatus = 'ISSUED';
      if (finalTotal <= EPSILON) {
        // Fully covered by advances
        finalStatus = 'PAID';
      } else if (allocatedPaid >= finalTotal - EPSILON) {
        finalStatus = 'PAID';
      } else if (allocatedPaid > 0) {
        finalStatus = 'PARTIALLY_PAID';
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'FINAL',
          status: finalStatus,
          paidAmount: Math.min(allocatedPaid, Math.max(finalTotal, 0)),
          orderId: order.id,
          ...billTo,
          subtotal: finalSubtotal,
          vatAmount: finalVat,
          discount: orderDiscount,
          total: finalTotal,
          paymentMethod: dto.paymentMethod || order.paymentMethod,
          notes: dto.notes,
          companyId,
          createdById: userId,
          items: { create: [...orderLineItems, ...deductionLineItems] },
          advanceDeductions: {
            create: advances.map((adv) => ({
              advanceInvoiceId: adv.id,
              subtotal: adv.subtotal,
              vatAmount: adv.vatAmount,
              total: adv.total,
            })),
          },
        },
        include: this.invoiceInclude,
      });

      // Order is now fully invoiced (final covers the remainder + deduction)
      await tx.order.update({
        where: { id: order.id },
        data: {
          invoicedAmount: orderTotal,
          advancedAmount: { decrement: deductionTotal },
        },
      });

      // Reallocate order.paidAmount across all non-cancelled invoices (FIFO by
      // createdAt). Without this, FINAL inherits only the advance's paidAmount
      // and ignores order payments made after the advance was issued.
      await this.paymentsService.recalculateOrderState(tx, order.id);

      return invoice;
    });

    // Re-fetch after transaction — recalculateOrderState mutated paidAmount/status.
    return this.findOneWith(db, companyId, created.id);
  }

  // Сверка с продажбата за всяка фактура в списък (виж invoice-order-diff.ts).
  // Активните покриващи фактури на засегнатите продажби се четат наведнъж.
  private async attachOrderDiff<
    T extends { orderId: string | null; type: InvoiceType; status: InvoiceStatus },
  >(db: Db, companyId: string, invoices: T[]): Promise<(T & { differsFromOrder: boolean })[]> {
    const orderIds = [
      ...new Set(
        invoices
          .filter((i) => i.orderId && isCoveringInvoice(i))
          .map((i) => i.orderId as string),
      ),
    ];
    if (orderIds.length === 0) {
      return invoices.map((i) => ({ ...i, differsFromOrder: false }));
    }

    const [orders, covering] = await Promise.all([
      db.order.findMany({
        where: { id: { in: orderIds }, companyId },
        select: { id: true, subtotal: true, vatAmount: true, total: true },
      }),
      db.invoice.findMany({
        where: {
          companyId,
          orderId: { in: orderIds },
          status: { not: 'CANCELLED' },
          type: { in: ['REGULAR', 'FINAL'] },
        },
        select: {
          orderId: true,
          type: true,
          status: true,
          subtotal: true,
          vatAmount: true,
          total: true,
          advanceDeductions: {
            select: { subtotal: true, vatAmount: true, total: true },
          },
        },
      }),
    ]);

    const byOrder = new Map<string, typeof covering>();
    for (const inv of covering) {
      const list = byOrder.get(inv.orderId as string) ?? [];
      list.push(inv);
      byOrder.set(inv.orderId as string, list);
    }
    const differs = new Map<string, boolean>();
    for (const order of orders) {
      differs.set(order.id, orderInvoicesDiffer(order, byOrder.get(order.id) ?? []));
    }

    return invoices.map((i) => ({
      ...i,
      differsFromOrder:
        !!i.orderId && isCoveringInvoice(i) ? differs.get(i.orderId) ?? false : false,
    }));
  }

  async findAll(companyId: string, query: QueryInvoicesDto) {
    const {
      search,
      status,
      type,
      types,
      orderId,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const allowedTypes: InvoiceType[] = ['REGULAR', 'PROFORMA', 'ADVANCE', 'FINAL', 'CREDIT_NOTE'];
    const typesArray = types
      ? (types
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t): t is InvoiceType => allowedTypes.includes(t as InvoiceType)))
      : undefined;

    // Синтетични филтри: неплатени (дължат пари) и просрочени (и с минал падеж)
    const statusWhere: Prisma.InvoiceWhereInput =
      status === 'UNPAID'
        ? { status: { in: ['ISSUED', 'PARTIALLY_PAID'] } }
        : status === 'OVERDUE'
          ? { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: new Date() } }
          : status
            ? { status }
            : {};

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...statusWhere,
      ...(typesArray && typesArray.length > 0
        ? { type: { in: typesArray } }
        : type
          ? { type }
          : {}),
      ...(orderId && { orderId }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            invoiceDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          order: {
            select: { id: true, orderNumber: true, status: true },
          },
          customer: true,
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    const data = await this.attachOrderDiff(this.prisma, companyId, rows);

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
    return this.findOneWith(this.prisma, companyId, id);
  }

  private async findOneWith(db: Db, companyId: string, id: string) {
    const invoice = await db.invoice.findFirst({
      where: { id, companyId },
      include: this.invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException(ErrorMessages.invoices.notFound);
    }

    const [withDiff] = await this.attachOrderDiff(db, companyId, [invoice]);
    return withDiff;
  }

  async update(companyId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(companyId, id);

    // Proformas can have their status changed freely
    if (invoice.type === 'PROFORMA' && dto.status) {
      return this.prisma.invoice.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.dueDate !== undefined && {
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: this.invoiceInclude,
      });
    }

    // Regular invoices: only allow updating DRAFT
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyUpdateDraft);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: this.invoiceInclude,
    });
  }

  async issue(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyIssueDraft);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: this.invoiceInclude,
    });
  }

  async recordPayment(
    companyId: string,
    id: string,
    dto: RecordPaymentDto,
    userId?: string,
  ) {
    const invoice = await this.findOne(companyId, id);

    // Cannot record payment on DRAFT or CANCELLED invoices
    if (invoice.status === 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.cannotPayDraft);
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.invoices.cannotPayCancelled);
    }
    if (invoice.status === 'PAID') {
      throw new BadRequestException(ErrorMessages.invoices.alreadyFullyPaid);
    }

    // Order-linked invoices delegate to Payment records (single source of truth)
    if (invoice.orderId) {
      await this.paymentsService.create(companyId, userId || '', {
        orderId: invoice.orderId,
        amount: dto.amount,
        method: dto.paymentMethod as any,
      });
      return this.findOne(companyId, id);
    }

    // Proforma fallback: keep scalar paidAmount behavior (no order to derive from)
    const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
    const invoiceTotal = Number(invoice.total);

    let newStatus: InvoiceStatus = invoice.status;
    if (newPaidAmount >= invoiceTotal) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: Math.min(newPaidAmount, invoiceTotal),
        status: newStatus,
        paymentMethod: dto.paymentMethod || invoice.paymentMethod,
        paymentDate: new Date(),
      },
      include: this.invoiceInclude,
    });
  }

  async cancel(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    // Cannot cancel PAID or already CANCELLED invoices
    if (invoice.status === 'PAID') {
      throw new BadRequestException(ErrorMessages.invoices.cannotCancelPaid);
    }
    if (invoice.status === 'PARTIALLY_PAID') {
      throw new BadRequestException(ErrorMessages.invoices.cannotCancelPartiallyPaid);
    }
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.invoices.alreadyCancelled);
    }

    // ADVANCE that's already deducted in a non-cancelled FINAL → block
    if (invoice.type === 'ADVANCE') {
      const deductionsInActiveFinals = await this.prisma.invoiceAdvanceDeduction.findMany({
        where: { advanceInvoiceId: invoice.id },
        include: { finalInvoice: true },
      });
      const blockedBy = deductionsInActiveFinals.find(
        (d) => d.finalInvoice.status !== 'CANCELLED',
      );
      if (blockedBy) {
        throw new BadRequestException(ErrorMessages.invoices.cannotCancelDeductedAdvance);
      }
    }

    return this.prisma.$transaction((tx) => this.cancelInTx(tx, invoice));
  }

  // Анулиране без проверките за плащане: при „Коригирай“ платената фактура се
  // анулира и парите (които живеят по продажбата) се преразпределят към новата.
  private async cancelInTx(
    tx: Prisma.TransactionClient,
    invoice: {
      id: string;
      type: InvoiceType;
      orderId: string | null;
      total: Prisma.Decimal;
    },
  ) {
    const { id } = invoice;
    {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED', paidAmount: 0, paymentDate: null },
        include: this.invoiceInclude,
      });

      if (invoice.orderId) {
        if (invoice.type === 'ADVANCE') {
          // Free up advance pool
          await tx.order.update({
            where: { id: invoice.orderId },
            data: { advancedAmount: { decrement: invoice.total } },
          });
        } else if (invoice.type === 'FINAL') {
          // Restore both invoicedAmount and advancedAmount (advances become available again)
          const deductions = await tx.invoiceAdvanceDeduction.findMany({
            where: { finalInvoiceId: invoice.id },
          });
          const deductedSum = deductions.reduce(
            (s, d) => s + Number(d.total),
            0,
          );
          await tx.order.update({
            where: { id: invoice.orderId },
            data: {
              invoicedAmount: { decrement: invoice.total },
              advancedAmount: { increment: deductedSum },
            },
          });
        } else {
          // REGULAR / PROFORMA / CREDIT_NOTE legacy behaviour
          await tx.order.update({
            where: { id: invoice.orderId },
            data: { invoicedAmount: { decrement: invoice.total } },
          });
        }
      }
      return updated;
    }
  }

  // „Коригирай“: анулира фактурата и издава нова от ТЕКУЩОТО състояние на
  // продажбата в една транзакция. Издадена фактура не се поправя (ЗДДС чл. 116)
  // — старият номер остава в дневника като анулиран, новата взима следващ номер.
  // Плащанията живеят по продажбата и се преразпределят към новата фактура.
  async correct(
    companyId: string,
    userId: string,
    id: string,
    dto: CorrectInvoiceDto,
  ) {
    const invoice = await this.findOne(companyId, id);

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException(
        ErrorMessages.invoices.cannotCorrectCancelled,
      );
    }
    if (!invoice.orderId) {
      throw new BadRequestException(
        ErrorMessages.invoices.cannotCorrectWithoutOrder,
      );
    }
    if (!['REGULAR', 'ADVANCE', 'FINAL'].includes(invoice.type)) {
      throw new BadRequestException(ErrorMessages.invoices.cannotCorrectType);
    }
    if (invoice.type === 'ADVANCE') {
      const activeFinal = await this.prisma.invoiceAdvanceDeduction.findFirst({
        where: {
          advanceInvoiceId: invoice.id,
          finalInvoice: { status: { not: 'CANCELLED' } },
        },
        select: { id: true },
      });
      if (activeFinal) {
        throw new BadRequestException(
          ErrorMessages.invoices.cannotCorrectDeductedAdvance,
        );
      }
    }

    const orderId = invoice.orderId;
    const inPlace = dto.mode === 'IN_PLACE';
    // При запазен номер непосочените полета остават както са на фактурата
    const common = {
      orderId,
      invoiceDate:
        dto.invoiceDate ??
        (inPlace ? invoice.invoiceDate.toISOString() : undefined),
      dueDate:
        dto.dueDate ??
        (inPlace && invoice.dueDate
          ? invoice.dueDate.toISOString()
          : undefined),
      notes: dto.notes ?? (inPlace ? (invoice.notes ?? undefined) : undefined),
      paymentMethod:
        dto.paymentMethod ??
        (inPlace ? (invoice.paymentMethod ?? undefined) : undefined),
      billToCustomerId: dto.billToCustomerId,
    };

    const created = await this.prisma.$transaction(async (tx) => {
      await this.cancelInTx(tx, invoice);

      let fresh: { id: string };
      if (invoice.type === 'ADVANCE') {
        fresh = await this.createAdvance(
          companyId,
          userId,
          {
            ...common,
            amount: dto.amount ?? Number(invoice.total),
            itemDescription:
              dto.itemDescription ?? invoice.items[0]?.description ?? undefined,
          },
          tx,
        );
      } else if (invoice.type === 'FINAL') {
        const advanceInvoiceIds = dto.advanceInvoiceIds?.length
          ? dto.advanceInvoiceIds
          : invoice.advanceDeductions.map((d) => d.advanceInvoiceId);
        fresh = await this.createFinal(
          companyId,
          userId,
          {
            ...common,
            advanceInvoiceIds,
            deductionDescriptionTemplate: dto.deductionDescriptionTemplate,
          },
          tx,
        );
      } else {
        fresh = await this.createFromOrder(companyId, userId, common, tx);
      }

      if (inPlace) {
        await this.adoptInvoice(tx, invoice.id, fresh.id);
        fresh = { id: invoice.id };
      }

      await this.paymentsService.recalculateOrderState(tx, orderId);
      return fresh;
    });

    return this.findOne(companyId, created.id);
  }

  // Запазен номер: новата фактура е издадена и валидирана по общия път, а
  // тук съдържанието ѝ (хедър, редове, приспадания) се прехвърля върху старата
  // и новият запис се трие. Новата беше с последния номер, така че триенето ѝ
  // не оставя дупка. Документите/протоколите, закачени за старата, остават.
  private async adoptInvoice(
    tx: Prisma.TransactionClient,
    oldId: string,
    freshId: string,
  ) {
    const fresh = await tx.invoice.findUniqueOrThrow({
      where: { id: freshId },
    });

    await tx.invoiceItem.deleteMany({ where: { invoiceId: oldId } });
    await tx.invoiceItem.updateMany({
      where: { invoiceId: freshId },
      data: { invoiceId: oldId },
    });
    await tx.invoiceAdvanceDeduction.deleteMany({
      where: { finalInvoiceId: oldId },
    });
    await tx.invoiceAdvanceDeduction.updateMany({
      where: { finalInvoiceId: freshId },
      data: { finalInvoiceId: oldId },
    });

    await tx.invoice.update({
      where: { id: oldId },
      data: {
        invoiceDate: fresh.invoiceDate,
        dueDate: fresh.dueDate,
        type: fresh.type,
        status: fresh.status,
        paidAmount: fresh.paidAmount,
        paymentMethod: fresh.paymentMethod,
        paymentDate: fresh.paymentDate,
        customerId: fresh.customerId,
        customerName: fresh.customerName,
        customerEik: fresh.customerEik,
        customerVatNumber: fresh.customerVatNumber,
        customerAddress: fresh.customerAddress,
        customerCity: fresh.customerCity,
        customerPostalCode: fresh.customerPostalCode,
        subtotal: fresh.subtotal,
        vatAmount: fresh.vatAmount,
        discount: fresh.discount,
        total: fresh.total,
        currencyId: fresh.currencyId,
        exchangeRate: fresh.exchangeRate,
        notes: fresh.notes,
      },
    });
    await tx.invoice.delete({ where: { id: freshId } });
  }

  async remove(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    // Only allow deleting DRAFT invoices
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyDeleteDraft);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { id } });
      // Free up invoiced amount on the order
      if (invoice.orderId) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { invoicedAmount: { decrement: invoice.total } },
        });
      }
    });

    return { message: 'Фактурата е изтрита успешно' };
  }

  // Get invoices for a specific order
  async findByOrder(companyId: string, orderId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { companyId, orderId },
      include: {
        _count: { select: { items: true } },
        // Табът „Фактури“ на продажбата показва кой аванс е приспаднат и
        // предлага за окончателна само свободните
        advanceDeductions: { select: { advanceInvoiceId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachOrderDiff(this.prisma, companyId, rows);
  }
}
