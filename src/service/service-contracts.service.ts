import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { ServiceNumberingService } from './service-numbering.service';
import {
  CreateServiceContractDto,
  UpdateServiceContractDto,
  QueryServiceContractsDto,
} from './dto';

const CONTRACT_INCLUDE = {
  customer: true,
  _count: { select: { serviceOrders: true } },
} as const;

@Injectable()
export class ServiceContractsService {
  constructor(
    private prisma: PrismaService,
    private numbering: ServiceNumberingService,
  ) {}

  async create(companyId: string, dto: CreateServiceContractDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) {
        throw new NotFoundException(ErrorMessages.customers.notFound);
      }

      const contractNumber =
        dto.contractNumber ||
        (await this.numbering.next('contract', companyId, tx));

      return tx.serviceContract.create({
        data: {
          companyId,
          contractNumber,
          name: dto.name,
          status: dto.status || 'ACTIVE',
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          monthlyFee: dto.monthlyFee ?? 0,
          includedHoursPerMonth: dto.includedHoursPerMonth ?? 0,
          responseTimeHours: dto.responseTimeHours,
          notes: dto.notes,
          customerId: dto.customerId,
        },
        include: CONTRACT_INCLUDE,
      });
    });
  }

  async findAll(companyId: string, query: QueryServiceContractsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.ServiceContractWhereInput = { companyId };
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { contractNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.serviceContract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.serviceContract.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const contract = await this.prisma.serviceContract.findFirst({
      where: { id, companyId },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) {
      throw new NotFoundException('Договорът не е намерен');
    }
    return contract;
  }

  async update(companyId: string, id: string, dto: UpdateServiceContractDto) {
    await this.findOne(companyId, id);
    return this.prisma.serviceContract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.serviceContract.delete({ where: { id } });
  }
}
