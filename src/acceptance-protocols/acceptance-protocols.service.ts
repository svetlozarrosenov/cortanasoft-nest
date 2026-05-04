import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAcceptanceProtocolDto,
  CreateAcceptanceProtocolItemDto,
  QueryAcceptanceProtocolsDto,
  UpdateAcceptanceProtocolDto,
} from './dto';

@Injectable()
export class AcceptanceProtocolsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    customer: true,
    order: {
      select: {
        id: true,
        orderNumber: true,
        orderDate: true,
        status: true,
      },
    },
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
    const prefix = `AHP-${year}-`;
    const last = await tx.acceptanceProtocol.findFirst({
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

  private buildItemsAndTotals(items: CreateAcceptanceProtocolItemDto[]) {
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

  async create(
    companyId: string,
    userId: string,
    dto: CreateAcceptanceProtocolDto,
  ) {
    const { subtotal, vatAmount, total, itemsData } = this.buildItemsAndTotals(
      dto.items || [],
    );
    const hasItems = itemsData.length > 0;

    return this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.generateDocumentNumber(companyId, tx);
      return tx.acceptanceProtocol.create({
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
          orderId: dto.orderId || null,
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

  async findAll(companyId: string, query: QueryAcceptanceProtocolsDto) {
    const {
      search,
      status,
      customerId,
      orderId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.AcceptanceProtocolWhereInput = {
      companyId,
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(orderId && { orderId }),
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
      this.prisma.acceptanceProtocol.findMany({
        where,
        include: {
          customer: true,
          order: { select: { id: true, orderNumber: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.acceptanceProtocol.count({ where }),
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

  async findByOrder(companyId: string, orderId: string) {
    return this.prisma.acceptanceProtocol.findMany({
      where: { companyId, orderId },
      orderBy: { documentDate: 'desc' },
      include: this.include,
    });
  }

  async findOne(companyId: string, id: string) {
    const doc = await this.prisma.acceptanceProtocol.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!doc) {
      throw new NotFoundException('Приемо-предавателният протокол не е намерен');
    }
    return doc;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateAcceptanceProtocolDto,
  ) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(
        'Анулирани протоколи не могат да бъдат редактирани',
      );
    }

    const totals =
      dto.items !== undefined ? this.buildItemsAndTotals(dto.items) : undefined;

    if (totals) {
      await this.prisma.acceptanceProtocolItem.deleteMany({
        where: { acceptanceProtocolId: id },
      });
    }

    return this.prisma.acceptanceProtocol.update({
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
        ...(dto.orderId !== undefined && { orderId: dto.orderId || null }),
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
      throw new BadRequestException('Протоколът вече е анулиран');
    }
    return this.prisma.acceptanceProtocol.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(
        'Анулирани протоколи не могат да бъдат изтрити',
      );
    }
    await this.prisma.acceptanceProtocol.delete({ where: { id } });
    return { message: 'Протоколът е изтрит успешно' };
  }
}
