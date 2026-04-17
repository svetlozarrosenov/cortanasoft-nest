import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoiceDto,
  CreateProformaDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
} from './dto';
import { Prisma, InvoiceStatus, OrderStatus } from '@prisma/client';
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
      // Proforma invoices: PRO-0000000001, PRO-0000000002, ...
      const prefix = `${typePrefix}-`;
      const count = await db.invoice.count({
        where: {
          companyId,
          invoiceNumber: { startsWith: prefix },
        },
      });
      return `${prefix}${(count + 1).toString().padStart(10, '0')}`;
    }

    // Regular invoices: 0000000001, 0000000002, ...
    // Count all non-proforma invoices for this company
    const count = await db.invoice.count({
      where: {
        companyId,
        NOT: { invoiceNumber: { startsWith: 'PRO-' } },
      },
    });

    return (count + 1).toString().padStart(10, '0');
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

    // Generate number + create in a transaction to prevent duplicates
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(companyId, 'INV', tx);

      const orderPaid = Number(order.paidAmount);
      const orderTotal = Number(order.total);
      const invoiceStatus: InvoiceStatus =
        orderPaid >= orderTotal ? 'PAID' : orderPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED';

      return tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          type: 'REGULAR',
          status: invoiceStatus,
          paidAmount: Math.min(orderPaid, orderTotal),
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEik,
          customerVatNumber,
          customerAddress,
          customerCity,
          customerPostalCode,
          subtotal: order.subtotal,
          vatAmount: order.vatAmount,
          discount: order.discount,
          total: order.total,
          paymentMethod: order.paymentMethod,
          notes: dto.notes,
          companyId,
          createdById: userId,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              description: item.product?.name || 'Артикул',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              discount: item.discount,
              total: item.subtotal,
              orderItemId: item.id,
            })),
          },
        },
        include: this.invoiceInclude,
      });
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
      orderId,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(status && { status }),
      ...(type && { type }),
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

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.invoiceInclude,
    });
  }

  async remove(companyId: string, id: string) {
    const invoice = await this.findOne(companyId, id);

    // Only allow deleting DRAFT invoices
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyDeleteDraft);
    }

    await this.prisma.invoice.delete({ where: { id } });

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
