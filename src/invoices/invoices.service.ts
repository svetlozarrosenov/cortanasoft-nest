import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoiceDto,
  CreateProformaDto,
  CreateAdvanceInvoiceDto,
  CreateFinalInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
} from './dto';
import { Prisma, InvoiceStatus, InvoiceType, OrderStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  private async generateInvoiceNumber(
    companyId: string,
    typePrefix: string = 'INV',
    tx?: any,
  ): Promise<string> {
    const db = tx || this.prisma;

    if (typePrefix !== 'INV') {
      const prefix = `${typePrefix}-`;
      const last = await db.invoice.findFirst({
        where: { companyId, invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });
      const lastNum = last
        ? parseInt(last.invoiceNumber.slice(prefix.length), 10)
        : 0;
      const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
      return `${prefix}${next.toString().padStart(10, '0')}`;
    }

    const last = await db.invoice.findFirst({
      where: { companyId, invoiceNumber: { not: { contains: '-' } } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const lastNum = last ? parseInt(last.invoiceNumber, 10) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return next.toString().padStart(10, '0');
  }

  private readonly invoiceInclude = {
    order: {
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
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

  async createFromOrder(
    companyId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ) {
    // Find order with all data
    const order = await this.prisma.order.findFirst({
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

    // Get customer EIK and VAT from customer record if available
    let customerEik: string | null = null;
    let customerVatNumber: string | null = null;
    let customerAddress = order.shippingAddress;
    let customerCity = order.shippingCity;
    let customerPostalCode = order.shippingPostalCode;

    if (order.customer) {
      customerEik = order.customer.eik;
      customerVatNumber = order.customer.vatNumber;
      customerAddress = customerAddress || order.customer.address;
      customerCity = customerCity || order.customer.city;
      customerPostalCode = customerPostalCode || order.customer.postalCode;
    }

    // Block REGULAR creation if there are unresolved ADVANCE invoices on this order
    const activeAdvances = await this.prisma.invoice.count({
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
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, 'INV', tx);

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
            description: item.product?.name || 'Артикул',
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
          customerId: order.customerId,
          customerName: order.customerName,
          customerEik,
          customerVatNumber,
          customerAddress,
          customerCity,
          customerPostalCode,
          subtotal: isFullFirstInvoice ? order.subtotal : partialSubtotal,
          vatAmount: isFullFirstInvoice ? order.vatAmount : partialVatAmount,
          discount: isFullFirstInvoice ? order.discount : partialDiscount,
          total: requestedAmount,
          paymentMethod: order.paymentMethod,
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
  ) {
    const order = await this.prisma.order.findFirst({
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
    const conflictingInvoices = await this.prisma.invoice.count({
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

    // Customer denormalization
    let customerEik: string | null = null;
    let customerVatNumber: string | null = null;
    let customerAddress = order.shippingAddress;
    let customerCity = order.shippingCity;
    let customerPostalCode = order.shippingPostalCode;
    if (order.customer) {
      customerEik = order.customer.eik;
      customerVatNumber = order.customer.vatNumber;
      customerAddress = customerAddress || order.customer.address;
      customerCity = customerCity || order.customer.city;
      customerPostalCode = customerPostalCode || order.customer.postalCode;
    }

    // Pro-rata split based on order's VAT structure
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const ratio = orderTotal > 0 ? requestedAmount / orderTotal : 0;
    const partialSubtotal = round2(Number(order.subtotal) * ratio);
    const partialVatAmount = round2(Number(order.vatAmount) * ratio);
    const effectiveVatRate = this.effectiveVatRateForOrder(order);

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, 'AVN', tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'ADVANCE',
          status: 'ISSUED',
          paidAmount: 0,
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEik,
          customerVatNumber,
          customerAddress,
          customerCity,
          customerPostalCode,
          subtotal: partialSubtotal,
          vatAmount: partialVatAmount,
          discount: 0,
          total: requestedAmount,
          paymentMethod: order.paymentMethod,
          notes: dto.notes,
          companyId,
          createdById: userId,
          items: {
            create: [
              {
                description: `Авансово плащане по поръчка ${order.orderNumber}`,
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

      return invoice;
    });
  }

  async createFinal(
    companyId: string,
    userId: string,
    dto: CreateFinalInvoiceDto,
  ) {
    const order = await this.prisma.order.findFirst({
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

    const advances = await this.prisma.invoice.findMany({
      where: {
        id: { in: dto.advanceInvoiceIds },
        companyId,
      },
      include: { deductedInFinals: true },
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

    // Customer denormalization
    let customerEik: string | null = null;
    let customerVatNumber: string | null = null;
    let customerAddress = order.shippingAddress;
    let customerCity = order.shippingCity;
    let customerPostalCode = order.shippingPostalCode;
    if (order.customer) {
      customerEik = order.customer.eik;
      customerVatNumber = order.customer.vatNumber;
      customerAddress = customerAddress || order.customer.address;
      customerCity = customerCity || order.customer.city;
      customerPostalCode = customerPostalCode || order.customer.postalCode;
    }

    const effectiveVatRate = this.effectiveVatRateForOrder(order);

    // Order line items + one negative line per advance deducted
    const orderLineItems = order.items.map((item) => ({
      productId: item.productId,
      description: item.product?.name || 'Артикул',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      total: item.subtotal,
      orderItemId: item.id,
    }));

    const deductionLineItems = advances.map((adv) => ({
      description: `Приспадане на авансова фактура ${adv.invoiceNumber}`,
      quantity: 1,
      unitPrice: -Number(adv.subtotal),
      vatRate: effectiveVatRate,
      discount: 0,
      total: -Number(adv.subtotal),
    }));

    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, 'INV', tx);

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
          customerId: order.customerId,
          customerName: order.customerName,
          customerEik,
          customerVatNumber,
          customerAddress,
          customerCity,
          customerPostalCode,
          subtotal: finalSubtotal,
          vatAmount: finalVat,
          discount: orderDiscount,
          total: finalTotal,
          paymentMethod: order.paymentMethod,
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

      return invoice;
    });
  }

  async createProforma(
    companyId: string,
    userId: string,
    dto: CreateProformaDto,
  ) {
    // Get company for default currency and VAT
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true, currencyId: true },
    });
    if (!company) {
      throw new NotFoundException('Компанията не е намерена');
    }

    const defaultVatRate = company.vatNumber ? 20 : 0;

    // Validate products if productId is provided
    const productIds = dto.items
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    let products: any[] = [];
    if (productIds.length > 0) {
      products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      });
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new BadRequestException(
          'Някои от посочените продукти не са намерени',
        );
      }
    }

    // Use company currency as default
    const currencyId = dto.currencyId || company.currencyId;

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = dto.items.map((item) => {
      const product = item.productId
        ? products.find((p) => p.id === item.productId)
        : null;
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate =
        item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemDiscount = item.discount ?? 0;
      const itemSubtotal = item.quantity * item.unitPrice - itemDiscount;
      const itemVat = itemSubtotal * (itemVatRate / 100);

      subtotal += itemSubtotal;
      vatAmount += itemVat;

      return {
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: itemVatRate,
        discount: itemDiscount,
        total: itemSubtotal,
      };
    });

    const invoiceDiscount = dto.discount ?? 0;
    const total = subtotal + vatAmount - invoiceDiscount;

    // Generate number + create in a transaction to prevent duplicates
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, 'PRO', tx);

      return tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'PROFORMA',
          status: 'DRAFT',
          customerId: dto.customerId || null,
          customerName: dto.customerName,
          customerEik: dto.customerEik || null,
          customerVatNumber: dto.customerVatNumber || null,
          customerAddress: dto.customerAddress || null,
          customerCity: dto.customerCity || null,
          customerPostalCode: dto.customerPostalCode || null,
          subtotal,
          vatAmount,
          discount: invoiceDiscount,
          total,
          paymentMethod: dto.paymentMethod || null,
          notes: dto.notes || null,
          currencyId,
          companyId,
          createdById: userId,
          items: {
            create: itemsData,
          },
        },
        include: this.invoiceInclude,
      });
    });
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

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(status && { status }),
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

    const [data, total] = await Promise.all([
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
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: this.invoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException(ErrorMessages.invoices.notFound);
    }

    return invoice;
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

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' },
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
          const deductedSum = deductions.reduce((s, d) => s + Number(d.total), 0);
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
    });
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
    return this.prisma.invoice.findMany({
      where: { companyId, orderId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
