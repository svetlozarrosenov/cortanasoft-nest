import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProformaDto,
  CreateProformaItemDto,
  UpdateProformaDto,
  QueryProformasDto,
  CreateProformaFromOrderDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class ProformasService {
  constructor(private prisma: PrismaService) {}

  private readonly proformaInclude = {
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
      },
    },
    _count: { select: { items: true } },
  };

  // Собствена редица за проформи — плосък 10-цифрен номер, без префикс.
  // Проформата не е данъчен документ, затова е напълно независима от
  // фискалната номерация на фактурите.
  private async generateProformaNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const db = tx || this.prisma;
    const last = await db.proforma.findFirst({
      where: { companyId },
      orderBy: { proformaNumber: 'desc' },
      select: { proformaNumber: true },
    });
    let next: number;
    if (last) {
      const lastNum = parseInt(last.proformaNumber, 10);
      next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    } else {
      // Първа проформа: номерът, зададен за компанията в Администрация (по подразбиране 1)
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { proformaDefaultStartNumber: true },
      });
      next = company?.proformaDefaultStartNumber ?? 1;
    }
    return next.toString().padStart(10, '0');
  }

  // Редовете и сумите на документа — обща сметка за създаване и редакция.
  private async calculateItems(
    companyId: string,
    items: CreateProformaItemDto[],
    documentDiscount: number,
    defaultVatRate: number,
  ) {
    // Validate products if productId is provided
    const productIds = items
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

    // Calculate totals
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = items.map((item) => {
      const product = item.productId
        ? products.find((p) => p.id === item.productId)
        : null;
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate =
        item.vatRate ??
        (isNaN(productVatRate) ? defaultVatRate : productVatRate);
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

    // Document-level discount reduces the taxable base; VAT is recomputed on the
    // reduced base so the tax is charged on the actual amount due.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const discountedBase = subtotal - documentDiscount;
    const vatFactor = subtotal > 0 ? discountedBase / subtotal : 1;
    const adjustedVat = round2(vatAmount * vatFactor);
    const total = round2(discountedBase + adjustedVat);

    return {
      itemsData,
      subtotal,
      vatAmount: adjustedVat,
      discount: documentDiscount,
      total,
    };
  }

  async create(companyId: string, userId: string, dto: CreateProformaDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true, currencyId: true },
    });
    if (!company) {
      throw new NotFoundException('Компанията не е намерена');
    }

    // Verify the customer belongs to this company (cross-tenant IDOR guard).
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Клиентът не е намерен');
    }

    const currencyId = dto.currencyId || company.currencyId;

    const {
      itemsData,
      subtotal,
      vatAmount: adjustedVat,
      discount: invoiceDiscount,
      total,
    } = await this.calculateItems(
      companyId,
      dto.items,
      dto.discount ?? 0,
      company.vatNumber ? 20 : 0,
    );

    return this.prisma.$transaction(async (tx) => {
      const proformaNumber = await this.generateProformaNumber(companyId, tx);

      return tx.proforma.create({
        data: {
          proformaNumber,
          proformaDate: dto.invoiceDate
            ? new Date(dto.invoiceDate)
            : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: 'DRAFT',
          customerId: dto.customerId || null,
          customerName: dto.customerName,
          customerEik: dto.customerEik || null,
          customerVatNumber: dto.customerVatNumber || null,
          customerAddress: dto.customerAddress || null,
          customerCity: dto.customerCity || null,
          customerPostalCode: dto.customerPostalCode || null,
          subtotal,
          vatAmount: adjustedVat,
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
        include: this.proformaInclude,
      });
    });
  }

  /**
   * Проформа по продажба (продажба → проформа → аванс/окончателна фактура).
   * Цялата сума = редовете на продажбата; част = един ред „Проформа по
   * поръчка …" с пропорционално ДДС (същото като частичната фактура).
   * Не пипа invoicedAmount — проформата не е данъчен документ.
   */
  async createFromOrder(
    companyId: string,
    userId: string,
    dto: CreateProformaFromOrderDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundException(ErrorMessages.invoices.orderNotFound);
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.proformas.orderCancelled);
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const orderTotal = Number(order.total);
    const amount = dto.amount !== undefined ? Number(dto.amount) : orderTotal;
    if (amount > orderTotal + 0.01) {
      throw new BadRequestException(ErrorMessages.proformas.amountExceedsTotal);
    }
    const isFull = Math.abs(amount - orderTotal) < 0.01;
    const ratio = orderTotal > 0 ? amount / orderTotal : 0;
    const subtotal = isFull
      ? order.subtotal
      : round2(Number(order.subtotal) * ratio);
    const vatAmount = isFull
      ? order.vatAmount
      : round2(Number(order.vatAmount) * ratio);
    const discount = isFull
      ? order.discount
      : round2(Number(order.discount) * ratio);
    const effectiveVatRate =
      Number(order.subtotal) > 0
        ? round2((Number(order.vatAmount) / Number(order.subtotal)) * 100)
        : 0;

    const items = isFull
      ? order.items.map((item) => ({
          productId: item.productId,
          description: item.description || item.product?.name || 'Артикул',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          total: item.subtotal,
        }))
      : [
          {
            description: `Проформа по поръчка ${order.orderNumber}`,
            quantity: 1,
            unitPrice: Number(subtotal),
            vatRate: effectiveVatRate,
            discount: 0,
            total: Number(subtotal),
          },
        ];

    return this.prisma.$transaction(async (tx) => {
      const proformaNumber = await this.generateProformaNumber(companyId, tx);
      return tx.proforma.create({
        data: {
          proformaNumber,
          proformaDate: dto.proformaDate
            ? new Date(dto.proformaDate)
            : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          status: 'ISSUED',
          orderId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEik: order.customer?.eik ?? null,
          customerVatNumber: order.customer?.vatNumber ?? null,
          customerAddress:
            order.customer?.address ?? order.shippingAddress ?? null,
          customerCity: order.customer?.city ?? order.shippingCity ?? null,
          customerPostalCode:
            order.customer?.postalCode ?? order.shippingPostalCode ?? null,
          subtotal,
          vatAmount,
          discount,
          total: amount,
          paymentMethod: dto.paymentMethod ?? order.paymentMethod ?? null,
          notes: dto.notes || null,
          currencyId: order.currencyId,
          companyId,
          createdById: userId,
          items: { create: items },
        },
        include: this.proformaInclude,
      });
    });
  }

  /** Проформите по една продажба — за таба „Фактури" на продажбата */
  async findByOrder(companyId: string, orderId: string) {
    return this.prisma.proforma.findMany({
      where: { companyId, orderId },
      orderBy: { createdAt: 'desc' },
      include: this.proformaInclude,
    });
  }

  async findAll(companyId: string, query: QueryProformasDto) {
    const {
      search,
      status,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProformaWhereInput = {
      companyId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            proformaDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { proformaNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.proforma.findMany({
        where,
        include: {
          customer: true,
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.proforma.count({ where }),
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
    const proforma = await this.prisma.proforma.findFirst({
      where: { id, companyId },
      include: this.proformaInclude,
    });

    if (!proforma) {
      throw new NotFoundException(ErrorMessages.invoices.notFound);
    }

    return proforma;
  }

  // Proformas are not tax documents — their status can be changed freely, and
  // so can everything else (клиент, дати, редове, суми) във всеки статус освен
  // „Анулирана". Номерът не се сменя.
  async update(companyId: string, id: string, dto: UpdateProformaDto) {
    const proforma = await this.findOne(companyId, id);

    const { status, ...content } = dto;
    const editsContent = Object.values(content).some((v) => v !== undefined);
    if (editsContent && proforma.status === 'CANCELLED') {
      throw new BadRequestException(
        ErrorMessages.invoices.cannotEditCancelledProforma,
      );
    }

    // Verify the customer belongs to this company (cross-tenant IDOR guard).
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException('Клиентът не е намерен');
    }

    // Нови редове или нова отстъпка на документа → сумите се смятат наново
    let totals: Awaited<
      ReturnType<ProformasService['calculateItems']>
    > | null = null;
    if (dto.items || dto.discount != null) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { vatNumber: true },
      });
      const items: CreateProformaItemDto[] =
        dto.items ??
        proforma.items.map((item) => ({
          productId: item.productId ?? undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
          discount: Number(item.discount),
        }));
      totals = await this.calculateItems(
        companyId,
        items,
        dto.discount ?? Number(proforma.discount),
        company?.vatNumber ? 20 : 0,
      );
    }

    return this.prisma.proforma.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(dto.invoiceDate && { proformaDate: new Date(dto.invoiceDate) }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.customerId !== undefined && {
          customerId: dto.customerId || null,
        }),
        ...(dto.customerName?.trim()
          ? { customerName: dto.customerName }
          : {}),
        ...(dto.customerEik !== undefined && {
          customerEik: dto.customerEik || null,
        }),
        ...(dto.customerVatNumber !== undefined && {
          customerVatNumber: dto.customerVatNumber || null,
        }),
        ...(dto.customerAddress !== undefined && {
          customerAddress: dto.customerAddress || null,
        }),
        ...(dto.customerCity !== undefined && {
          customerCity: dto.customerCity || null,
        }),
        ...(dto.customerPostalCode !== undefined && {
          customerPostalCode: dto.customerPostalCode || null,
        }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod || null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.currencyId && { currencyId: dto.currencyId }),
        ...(totals && {
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          discount: totals.discount,
          total: totals.total,
        }),
        ...(dto.items &&
          totals && {
            items: { deleteMany: {}, create: totals.itemsData },
          }),
      },
      include: this.proformaInclude,
    });
  }

  async cancel(companyId: string, id: string) {
    const proforma = await this.findOne(companyId, id);

    if (proforma.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.invoices.alreadyCancelled);
    }

    return this.prisma.proforma.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.proformaInclude,
    });
  }

  async remove(companyId: string, id: string) {
    const proforma = await this.findOne(companyId, id);

    // Only allow deleting DRAFT proformas
    if (proforma.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.invoices.canOnlyDeleteDraft);
    }

    await this.prisma.proforma.delete({ where: { id } });

    return { message: 'Проформата е изтрита успешно' };
  }
}
