import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto, QueryOffersDto } from './dto';
import { Prisma } from '@prisma/client';

const OFFER_INCLUDE = {
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
  resultingOrder: {
    select: { id: true, orderNumber: true, status: true },
  },
  _count: { select: { items: true } },
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  private async generateOfferNumber(
    companyId: string,
    tx?: any,
  ): Promise<string> {
    const db = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `OFR-${year}-`;

    const count = await db.offer.count({
      where: {
        companyId,
        offerNumber: { startsWith: prefix },
      },
    });

    return `${prefix}${(count + 1).toString().padStart(5, '0')}`;
  }

  async create(companyId: string, userId: string, dto: CreateOfferDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true, currencyId: true },
    });
    if (!company) throw new NotFoundException('Компанията не е намерена');

    const defaultVatRate = company.vatNumber ? 20 : 0;

    // Validate products if provided
    const productIds = dto.items
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    let products: any[] = [];
    if (productIds.length > 0) {
      products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      });
      const foundIds = new Set(products.map((p: any) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
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
        ? products.find((p: any) => p.id === item.productId)
        : null;
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate =
        item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemDiscount = item.discount ?? 0;
      const itemSubtotal = round2(item.quantity * item.unitPrice - itemDiscount);
      const itemVat = round2(itemSubtotal * (itemVatRate / 100));

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

    subtotal = round2(subtotal);
    vatAmount = round2(vatAmount);
    const offerDiscount = dto.discount ?? 0;
    const total = round2(subtotal + vatAmount - offerDiscount);

    return this.prisma.$transaction(async (tx) => {
      const offerNumber = await this.generateOfferNumber(companyId, tx);

      return tx.offer.create({
        data: {
          offerNumber,
          offerDate: dto.offerDate ? new Date(dto.offerDate) : new Date(),
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          status: 'DRAFT',
          customerId: dto.customerId || null,
          customerName: dto.customerName,
          customerEik: dto.customerEik || null,
          customerVatNumber: dto.customerVatNumber || null,
          customerMolName: dto.customerMolName || null,
          customerEmail: dto.customerEmail || null,
          customerPhone: dto.customerPhone || null,
          customerAddress: dto.customerAddress || null,
          customerCity: dto.customerCity || null,
          customerPostalCode: dto.customerPostalCode || null,
          subtotal,
          vatAmount,
          discount: offerDiscount,
          total,
          notes: dto.notes || null,
          richDescription: dto.richDescription || null,
          currencyId,
          companyId,
          createdById: userId,
          items: { create: itemsData },
        },
        include: OFFER_INCLUDE,
      });
    });
  }

  async findAll(companyId: string, query: QueryOffersDto) {
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

    const where: Prisma.OfferWhereInput = { companyId };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    if (dateFrom || dateTo) {
      where.offerDate = {};
      if (dateFrom) where.offerDate.gte = new Date(dateFrom);
      if (dateTo) where.offerDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { offerNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSort = [
      'createdAt',
      'offerDate',
      'offerNumber',
      'status',
      'total',
      'customerName',
    ];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: OFFER_INCLUDE,
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.offer.count({ where }),
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
    const offer = await this.prisma.offer.findFirst({
      where: { id, companyId },
      include: OFFER_INCLUDE,
    });

    if (!offer) throw new NotFoundException('Офертата не е намерена');
    return offer;
  }

  async update(companyId: string, id: string, dto: UpdateOfferDto) {
    const offer = await this.findOne(companyId, id);

    if (offer.status !== 'DRAFT') {
      throw new BadRequestException(
        'Може да редактирате само чернови оферти',
      );
    }

    if (!dto.items) {
      return this.prisma.offer.update({
        where: { id },
        data: {
          ...(dto.customerId !== undefined && {
            customerId: dto.customerId || null,
          }),
          ...(dto.customerName && { customerName: dto.customerName }),
          ...(dto.customerEik !== undefined && {
            customerEik: dto.customerEik || null,
          }),
          ...(dto.customerVatNumber !== undefined && {
            customerVatNumber: dto.customerVatNumber || null,
          }),
          ...(dto.customerMolName !== undefined && {
            customerMolName: dto.customerMolName || null,
          }),
          ...(dto.customerEmail !== undefined && {
            customerEmail: dto.customerEmail || null,
          }),
          ...(dto.customerPhone !== undefined && {
            customerPhone: dto.customerPhone || null,
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
          ...(dto.validUntil !== undefined && {
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
          ...(dto.richDescription !== undefined && {
            richDescription: dto.richDescription || null,
          }),
        },
        include: OFFER_INCLUDE,
      });
    }

    // Full recalculate with items replacement
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true },
    });
    const defaultVatRate = company?.vatNumber ? 20 : 0;

    const productIds = dto.items
      .filter((item) => item.productId)
      .map((item) => item.productId!);

    let products: any[] = [];
    if (productIds.length > 0) {
      products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
      });
    }

    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = dto.items.map((item) => {
      const product = item.productId
        ? products.find((p: any) => p.id === item.productId)
        : null;
      const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
      const itemVatRate =
        item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
      const itemDiscount = item.discount ?? 0;
      const itemSubtotal = round2(item.quantity * item.unitPrice - itemDiscount);
      const itemVat = round2(itemSubtotal * (itemVatRate / 100));

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

    subtotal = round2(subtotal);
    vatAmount = round2(vatAmount);
    const offerDiscount = dto.discount ?? offer.discount.toNumber();
    const total = round2(subtotal + vatAmount - offerDiscount);

    return this.prisma.$transaction(async (tx) => {
      await tx.offerItem.deleteMany({ where: { offerId: id } });

      return tx.offer.update({
        where: { id },
        data: {
          ...(dto.customerName && { customerName: dto.customerName }),
          ...(dto.customerId !== undefined && {
            customerId: dto.customerId || null,
          }),
          ...(dto.customerEik !== undefined && {
            customerEik: dto.customerEik || null,
          }),
          ...(dto.customerVatNumber !== undefined && {
            customerVatNumber: dto.customerVatNumber || null,
          }),
          ...(dto.customerMolName !== undefined && {
            customerMolName: dto.customerMolName || null,
          }),
          ...(dto.customerEmail !== undefined && {
            customerEmail: dto.customerEmail || null,
          }),
          ...(dto.customerPhone !== undefined && {
            customerPhone: dto.customerPhone || null,
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
          ...(dto.validUntil !== undefined && {
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
          ...(dto.richDescription !== undefined && {
            richDescription: dto.richDescription || null,
          }),
          subtotal,
          vatAmount,
          discount: offerDiscount,
          total,
          items: { create: itemsData },
        },
        include: OFFER_INCLUDE,
      });
    });
  }

  async send(companyId: string, id: string) {
    const offer = await this.findOne(companyId, id);
    if (offer.status !== 'DRAFT') {
      throw new BadRequestException('Може да изпратите само чернови оферти');
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'SENT' },
      include: OFFER_INCLUDE,
    });
  }

  async accept(companyId: string, id: string) {
    const offer = await this.findOne(companyId, id);
    if (offer.status !== 'SENT') {
      throw new BadRequestException(
        'Може да приемете само изпратени оферти',
      );
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: OFFER_INCLUDE,
    });
  }

  async reject(companyId: string, id: string) {
    const offer = await this.findOne(companyId, id);
    if (offer.status !== 'SENT' && offer.status !== 'DRAFT') {
      throw new BadRequestException(
        'Може да отхвърлите само чернови или изпратени оферти',
      );
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: OFFER_INCLUDE,
    });
  }

  async cancel(companyId: string, id: string) {
    const offer = await this.findOne(companyId, id);
    if (offer.status === 'CANCELLED') {
      throw new BadRequestException('Офертата вече е анулирана');
    }
    if (offer.status === 'ACCEPTED') {
      throw new BadRequestException(
        'Не може да анулирате приета оферта',
      );
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: OFFER_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    const offer = await this.findOne(companyId, id);
    if (offer.status !== 'DRAFT') {
      throw new BadRequestException(
        'Може да изтриете само чернови оферти',
      );
    }
    return this.prisma.offer.delete({ where: { id } });
  }

  async convertToOrder(companyId: string, id: string, userId: string) {
    const offer = await this.findOne(companyId, id);

    if (offer.status !== 'ACCEPTED' && offer.status !== 'SENT') {
      throw new BadRequestException(
        'Може да конвертирате само изпратени или приети оферти',
      );
    }

    // Block duplicate order creation from the same offer (unique FK enforces this at DB level too)
    const existing = await this.prisma.order.findUnique({
      where: { sourceOfferId: id },
      select: { id: true, orderNumber: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Вече има поръчка (${existing.orderNumber}) от тази оферта`,
      );
    }

    // Free-text offer items (no productId) cannot be mapped to order items — skip them.
    // They are prose descriptions; the descriptive content is already in richDescription.
    const convertibleItems = offer.items.filter((item) => item.productId);
    if (convertibleItems.length === 0) {
      throw new BadRequestException(
        'Няма продукти с productId в офертата — не може да се създаде поръчка',
      );
    }

    // Mark as accepted if it was sent
    if (offer.status === 'SENT') {
      await this.prisma.offer.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
    }

    // Generate order number (inside transaction below)
    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const prefix = `ORD-${year}-`;
      const count = await tx.order.count({
        where: { companyId, orderNumber: { startsWith: prefix } },
      });
      const orderNumber = `${prefix}${(count + 1).toString().padStart(5, '0')}`;

      return tx.order.create({
        data: {
          orderNumber,
          status: 'DRAFT',
          customerId: offer.customerId,
          customerName: offer.customerName,
          customerEmail: offer.customerEmail,
          customerPhone: offer.customerPhone,
          shippingAddress: offer.customerAddress,
          shippingCity: offer.customerCity,
          shippingPostalCode: offer.customerPostalCode,
          subtotal: offer.subtotal,
          vatAmount: offer.vatAmount,
          discount: offer.discount,
          total: offer.total,
          notes: `От оферта ${offer.offerNumber}`,
          currencyId: offer.currencyId,
          sourceOfferId: id,
          companyId,
          createdById: userId,
          items: {
            create: convertibleItems.map((item) => ({
              productId: item.productId!,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              discount: item.discount,
              subtotal: item.total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }
}
