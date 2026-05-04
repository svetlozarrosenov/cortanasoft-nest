import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockReceiptDto,
  CreateStockReceiptItemDto,
  QueryStockReceiptsDto,
  UpdateStockReceiptDto,
} from './dto';

@Injectable()
export class StockReceiptsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    customer: true,
    invoice: { select: { id: true, invoiceNumber: true } },
    serviceOrder: { select: { id: true, orderNumber: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
    items: {
      include: {
        product: {
          select: { id: true, sku: true, name: true, unit: true, type: true },
        },
      },
    },
    _count: { select: { items: true } },
  };

  private async generateDocumentNumber(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SR-${year}-`;
    const last = await tx.stockReceipt.findFirst({
      where: { companyId, documentNumber: { startsWith: prefix } },
      orderBy: { documentNumber: 'desc' },
      select: { documentNumber: true },
    });
    const lastNum = last
      ? parseInt(last.documentNumber.slice(prefix.length), 10)
      : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}${next.toString().padStart(5, '0')}`;
  }

  private buildItemsAndTotals(items: CreateStockReceiptItemDto[]) {
    let subtotal = 0;
    let vatAmount = 0;
    const itemsData = items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemVat = itemTotal * (item.vatRate / 100);
      subtotal += itemTotal;
      vatAmount += itemVat;
      return {
        productId: item.productId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        total: itemTotal,
      };
    });
    return { subtotal, vatAmount, total: subtotal + vatAmount, itemsData };
  }

  async create(companyId: string, userId: string, dto: CreateStockReceiptDto) {
    const { subtotal, vatAmount, total, itemsData } = this.buildItemsAndTotals(
      dto.items || [],
    );
    const hasItems = itemsData.length > 0;

    return this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.generateDocumentNumber(companyId, tx);
      return tx.stockReceipt.create({
        data: {
          documentNumber,
          documentDate: dto.documentDate ? new Date(dto.documentDate) : new Date(),
          status: 'ISSUED',
          customerId: dto.customerId || null,
          recipientName: dto.recipientName,
          recipientEik: dto.recipientEik || null,
          recipientAddress: dto.recipientAddress || null,
          recipientCity: dto.recipientCity || null,
          senderRepresentative: dto.senderRepresentative || null,
          receiverRepresentative: dto.receiverRepresentative || null,
          subtotal: hasItems ? subtotal : null,
          vatAmount: hasItems ? vatAmount : null,
          total: hasItems ? total : null,
          invoiceId: dto.invoiceId || null,
          serviceOrderId: dto.serviceOrderId || null,
          notes: dto.notes || null,
          companyId,
          createdById: userId,
          ...(hasItems && { items: { create: itemsData } }),
        },
        include: this.include,
      });
    });
  }

  async findAll(companyId: string, query: QueryStockReceiptsDto) {
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

    const where: Prisma.StockReceiptWhereInput = {
      companyId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            documentDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { recipientName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.stockReceipt.findMany({
        where,
        include: {
          customer: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.stockReceipt.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const doc = await this.prisma.stockReceipt.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!doc) {
      throw new NotFoundException('Стоковата разписка не е намерена');
    }
    return doc;
  }

  async update(companyId: string, id: string, dto: UpdateStockReceiptDto) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(
        'Анулирани разписки не могат да бъдат редактирани',
      );
    }

    const totals =
      dto.items !== undefined ? this.buildItemsAndTotals(dto.items) : undefined;

    if (totals) {
      await this.prisma.stockReceiptItem.deleteMany({
        where: { stockReceiptId: id },
      });
    }

    return this.prisma.stockReceipt.update({
      where: { id },
      data: {
        ...(dto.documentDate !== undefined && {
          documentDate: new Date(dto.documentDate),
        }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
        ...(dto.recipientEik !== undefined && { recipientEik: dto.recipientEik || null }),
        ...(dto.recipientAddress !== undefined && { recipientAddress: dto.recipientAddress || null }),
        ...(dto.recipientCity !== undefined && { recipientCity: dto.recipientCity || null }),
        ...(dto.senderRepresentative !== undefined && { senderRepresentative: dto.senderRepresentative || null }),
        ...(dto.receiverRepresentative !== undefined && { receiverRepresentative: dto.receiverRepresentative || null }),
        ...(dto.invoiceId !== undefined && { invoiceId: dto.invoiceId || null }),
        ...(dto.serviceOrderId !== undefined && { serviceOrderId: dto.serviceOrderId || null }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(totals && {
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          ...(totals.itemsData.length > 0 && {
            items: { create: totals.itemsData },
          }),
        }),
      },
      include: this.include,
    });
  }

  async cancel(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException('Разписката вече е анулирана');
    }
    return this.prisma.stockReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(
        'Анулирани разписки не могат да бъдат изтрити',
      );
    }
    await this.prisma.stockReceipt.delete({ where: { id } });
    return { message: 'Стоковата разписка е изтрита успешно' };
  }
}
