import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        firstName: dto.firstName || '',
        lastName: dto.lastName || '',
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
        companyId,
      },
    });
  }

  async findAll(companyId: string, query: QueryLeadsDto) {
    const {
      search,
      unlinked,
      page = 1,
      limit = 20,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = query;

    const where: Prisma.LeadWhereInput = {
      companyId,
      ...(unlinked && { customerId: null }),
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = [
      'firstName',
      'lastName',
      'email',
      'createdAt',
      'updatedAt',
    ];
    const orderByField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'lastName';
    const orderByDirection = sortOrder === 'desc' ? 'desc' : 'asc';

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { [orderByField]: orderByDirection },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
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
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async update(companyId: string, id: string, dto: UpdateLeadDto) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Lead not found');
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.prisma.lead.delete({
      where: { id },
    });

    return { message: 'Lead deleted successfully' };
  }

  async setAsPrimary(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    await this.prisma.lead.updateMany({
      where: {
        customerId: lead.customerId,
        isPrimary: true,
        id: { not: id },
      },
      data: { isPrimary: false },
    });

    return this.prisma.lead.update({
      where: { id },
      data: { isPrimary: true },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByCustomer(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.lead.findMany({
      where: { customerId, companyId },
      orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
    });
  }
}
