import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProformaDto,
  UpdateProformaDto,
  QueryProformasDto,
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
    const lastNum = last ? parseInt(last.proformaNumber, 10) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return next.toString().padStart(10, '0');
  }

  async create(companyId: string, userId: string, dto: CreateProformaDto) {
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

    // Document-level discount reduces the taxable base; VAT is recomputed on the
    // reduced base so the tax is charged on the actual amount due.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const invoiceDiscount = dto.discount ?? 0;
    const discountedBase = subtotal - invoiceDiscount;
    const vatFactor = subtotal > 0 ? discountedBase / subtotal : 1;
    const adjustedVat = round2(vatAmount * vatFactor);
    const total = round2(discountedBase + adjustedVat);

    return this.prisma.$transaction(async (tx) => {
      const proformaNumber = await this.generateProformaNumber(companyId, tx);

      return tx.proforma.create({
        data: {
          proformaNumber,
          proformaDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
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

  // Proformas are not tax documents — their status can be changed freely.
  async update(companyId: string, id: string, dto: UpdateProformaDto) {
    await this.findOne(companyId, id);

    return this.prisma.proforma.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
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
