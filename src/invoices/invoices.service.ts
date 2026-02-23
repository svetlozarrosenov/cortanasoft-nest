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

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(
    companyId: string,
    typePrefix: string = 'INV',
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${typePrefix}-${year}-`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(
        lastInvoice.invoiceNumber.split('-').pop() || '0',
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
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

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(companyId);

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

    // Create invoice with items
    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        type: 'REGULAR',
        status: 'DRAFT',
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

    // Generate proforma number
    const invoiceNumber = await this.generateInvoiceNumber(companyId, 'PRO');

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

    return this.prisma.invoice.create({
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
  }

  async findAll(companyId: string, query: QueryInvoicesDto) {
    const {
      search,
      status,
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

    // Only allow updating DRAFT invoices
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

  async recordPayment(companyId: string, id: string, dto: RecordPaymentDto) {
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

    const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
    const invoiceTotal = Number(invoice.total);

    // Determine new status
    let newStatus: InvoiceStatus = invoice.status;
    if (newPaidAmount >= invoiceTotal) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: Math.min(newPaidAmount, invoiceTotal), // Don't overpay
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
