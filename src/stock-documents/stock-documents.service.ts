import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockDocumentDto,
  UpdateStockDocumentDto,
  QueryStockDocumentsDto,
} from './dto';
import { Prisma, StockDocumentType } from '@prisma/client';

@Injectable()
export class StockDocumentsService {
  constructor(private prisma: PrismaService) {}

  private getTypePrefix(type: StockDocumentType): string {
    switch (type) {
      case 'STOCK_RECEIPT':
        return 'SR';
      case 'ACCEPTANCE_PROTOCOL':
        return 'AHP';
      case 'ASCERTAINMENT_PROTOCOL':
        return 'AP';
    }
  }

  private async generateDocumentNumber(
    companyId: string,
    type: StockDocumentType,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${this.getTypePrefix(type)}-${year}-`;

    const lastDoc = await this.prisma.stockDocument.findFirst({
      where: {
        companyId,
        documentNumber: { startsWith: prefix },
      },
      orderBy: { documentNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastDoc) {
      const lastNumber = parseInt(
        lastDoc.documentNumber.split('-').pop() || '0',
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  private readonly documentInclude = {
    customer: true,
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

  async create(companyId: string, userId: string, dto: CreateStockDocumentDto) {
    const documentNumber = await this.generateDocumentNumber(
      companyId,
      dto.type,
    );

    // Calculate totals from items
    let subtotal = 0;
    let vatAmount = 0;

    const itemsData = (dto.items || []).map((item) => {
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

    const total = subtotal + vatAmount;
    const hasItems = itemsData.length > 0;

    return this.prisma.stockDocument.create({
      data: {
        documentNumber,
        documentDate: dto.documentDate
          ? new Date(dto.documentDate)
          : new Date(),
        type: dto.type,
        status: 'DRAFT',
        customerId: dto.customerId || null,
        recipientName: dto.recipientName,
        recipientEik: dto.recipientEik || null,
        recipientAddress: dto.recipientAddress || null,
        recipientCity: dto.recipientCity || null,
        senderRepresentative: dto.senderRepresentative || null,
        receiverRepresentative: dto.receiverRepresentative || null,
        subject: dto.subject || null,
        findings: dto.findings || null,
        conclusion: dto.conclusion || null,
        commissionMembers: dto.commissionMembers || [],
        subtotal: hasItems ? subtotal : null,
        vatAmount: hasItems ? vatAmount : null,
        total: hasItems ? total : null,
        orderId: dto.orderId || null,
        invoiceId: dto.invoiceId || null,
        notes: dto.notes || null,
        companyId,
        createdById: userId,
        ...(itemsData.length > 0 && {
          items: { create: itemsData },
        }),
      },
      include: this.documentInclude,
    });
  }

  async findAll(companyId: string, query: QueryStockDocumentsDto) {
    const {
      search,
      type,
      status,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.StockDocumentWhereInput = {
      companyId,
      ...(type && { type }),
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
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.stockDocument.findMany({
        where,
        include: {
          customer: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.stockDocument.count({ where }),
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
    const doc = await this.prisma.stockDocument.findFirst({
      where: { id, companyId },
      include: this.documentInclude,
    });

    if (!doc) {
      throw new NotFoundException('Документът не е намерен');
    }

    return doc;
  }

  async update(companyId: string, id: string, dto: UpdateStockDocumentDto) {
    const doc = await this.findOne(companyId, id);

    if (doc.status !== 'DRAFT') {
      throw new BadRequestException(
        'Само документи в статус Чернова могат да бъдат редактирани',
      );
    }

    // If items provided, recalculate totals and replace items
    let subtotal: number | undefined;
    let vatAmount: number | undefined;
    let total: number | undefined;
    let itemsData: any[] | undefined;

    if (dto.items !== undefined) {
      subtotal = 0;
      vatAmount = 0;

      itemsData = dto.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const itemVat = itemTotal * (item.vatRate / 100);
        subtotal! += itemTotal;
        vatAmount! += itemVat;

        return {
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          total: itemTotal,
        };
      });

      total = subtotal + vatAmount;
    }

    // Delete old items if replacing
    if (itemsData !== undefined) {
      await this.prisma.stockDocumentItem.deleteMany({
        where: { stockDocumentId: id },
      });
    }

    return this.prisma.stockDocument.update({
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
        ...(dto.subject !== undefined && { subject: dto.subject || null }),
        ...(dto.findings !== undefined && { findings: dto.findings || null }),
        ...(dto.conclusion !== undefined && { conclusion: dto.conclusion || null }),
        ...(dto.commissionMembers !== undefined && { commissionMembers: dto.commissionMembers }),
        ...(dto.orderId !== undefined && { orderId: dto.orderId || null }),
        ...(dto.invoiceId !== undefined && { invoiceId: dto.invoiceId || null }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(subtotal !== undefined && { subtotal }),
        ...(vatAmount !== undefined && { vatAmount }),
        ...(total !== undefined && { total }),
        ...(itemsData !== undefined && itemsData.length > 0 && {
          items: { create: itemsData },
        }),
      },
      include: this.documentInclude,
    });
  }

  async issue(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);

    if (doc.status !== 'DRAFT') {
      throw new BadRequestException(
        'Само документи в статус Чернова могат да бъдат издадени',
      );
    }

    return this.prisma.stockDocument.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: this.documentInclude,
    });
  }

  async cancel(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);

    if (doc.status === 'CANCELLED') {
      throw new BadRequestException('Документът вече е анулиран');
    }

    return this.prisma.stockDocument.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.documentInclude,
    });
  }

  async remove(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);

    if (doc.status !== 'DRAFT') {
      throw new BadRequestException(
        'Само документи в статус Чернова могат да бъдат изтрити',
      );
    }

    await this.prisma.stockDocument.delete({ where: { id } });

    return { message: 'Документът е изтрит успешно' };
  }
}
