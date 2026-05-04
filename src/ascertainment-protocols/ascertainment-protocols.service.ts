import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAscertainmentProtocolDto,
  QueryAscertainmentProtocolsDto,
  UpdateAscertainmentProtocolDto,
} from './dto';

@Injectable()
export class AscertainmentProtocolsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    customer: true,
    serviceOrder: { select: { id: true, orderNumber: true } },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
  };

  private async generateDocumentNumber(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `AP-${year}-`;
    const last = await tx.ascertainmentProtocol.findFirst({
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

  async create(
    companyId: string,
    userId: string,
    dto: CreateAscertainmentProtocolDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const documentNumber = await this.generateDocumentNumber(companyId, tx);
      return tx.ascertainmentProtocol.create({
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
          subject: dto.subject || null,
          findings: dto.findings || null,
          conclusion: dto.conclusion || null,
          commissionMembers: dto.commissionMembers || [],
          serviceOrderId: dto.serviceOrderId || null,
          notes: dto.notes || null,
          companyId,
          createdById: userId,
        },
        include: this.include,
      });
    });
  }

  async findAll(companyId: string, query: QueryAscertainmentProtocolsDto) {
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

    const where: Prisma.AscertainmentProtocolWhereInput = {
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
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [data, total] = await Promise.all([
      this.prisma.ascertainmentProtocol.findMany({
        where,
        include: {
          customer: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.ascertainmentProtocol.count({ where }),
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
    const doc = await this.prisma.ascertainmentProtocol.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!doc) {
      throw new NotFoundException('Констативният протокол не е намерен');
    }
    return doc;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateAscertainmentProtocolDto,
  ) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(
        'Анулирани протоколи не могат да бъдат редактирани',
      );
    }

    return this.prisma.ascertainmentProtocol.update({
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
        ...(dto.serviceOrderId !== undefined && { serviceOrderId: dto.serviceOrderId || null }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
      },
      include: this.include,
    });
  }

  async cancel(companyId: string, id: string) {
    const doc = await this.findOne(companyId, id);
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException('Протоколът вече е анулиран');
    }
    return this.prisma.ascertainmentProtocol.update({
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
    await this.prisma.ascertainmentProtocol.delete({ where: { id } });
    return { message: 'Протоколът е изтрит успешно' };
  }
}
