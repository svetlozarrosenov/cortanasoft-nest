import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, QueryDealsDto } from './dto';
import { Prisma, DealStatus } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateDealDto, userId?: string) {
    // Ако не е подадена валута, използваме валутата по подразбиране на компанията
    let currencyId = dto.currencyId;
    if (!currencyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { currencyId: true },
      });
      currencyId = company?.currencyId || undefined;
    }

    return this.prisma.deal.create({
      data: {
        ...dto,
        currencyId,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
        companyId,
        createdById: userId,
      },
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
        currency: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, query: QueryDealsDto) {
    const {
      search,
      status,
      customerId,
      assignedToId,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.DealWhereInput = {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(assignedToId && { assignedToId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
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
          currency: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return {
      items,
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, companyId },
      include: {
        customer: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        currency: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  async update(companyId: string, id: string, dto: UpdateDealDto) {
    await this.findOne(companyId, id);

    return this.prisma.deal.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
        actualCloseDate: dto.actualCloseDate
          ? new Date(dto.actualCloseDate)
          : undefined,
      },
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
        currency: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.deal.delete({
      where: { id },
    });
  }

  async updateStatus(
    companyId: string,
    id: string,
    status: DealStatus,
    lostReason?: string,
  ) {
    await this.findOne(companyId, id);

    const data: Prisma.DealUpdateInput = {
      status,
    };

    // Ако сделката е затворена (спечелена или загубена), записваме датата
    if (status === DealStatus.CLOSED_WON || status === DealStatus.CLOSED_LOST) {
      data.actualCloseDate = new Date();
    }

    // Ако е загубена, записваме причината
    if (status === DealStatus.CLOSED_LOST && lostReason) {
      data.lostReason = lostReason;
    }

    return this.prisma.deal.update({
      where: { id },
      data,
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
        currency: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  getStatuses() {
    return Object.values(DealStatus);
  }

  async getStatistics(companyId: string) {
    const [totalDeals, openDeals, wonDeals, lostDeals, totalValue, wonValue] =
      await Promise.all([
        this.prisma.deal.count({ where: { companyId, isActive: true } }),
        this.prisma.deal.count({
          where: {
            companyId,
            isActive: true,
            status: {
              notIn: [DealStatus.CLOSED_WON, DealStatus.CLOSED_LOST],
            },
          },
        }),
        this.prisma.deal.count({
          where: { companyId, status: DealStatus.CLOSED_WON },
        }),
        this.prisma.deal.count({
          where: { companyId, status: DealStatus.CLOSED_LOST },
        }),
        this.prisma.deal.aggregate({
          where: {
            companyId,
            isActive: true,
            status: {
              notIn: [DealStatus.CLOSED_WON, DealStatus.CLOSED_LOST],
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.deal.aggregate({
          where: { companyId, status: DealStatus.CLOSED_WON },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      totalPipelineValue: totalValue._sum.amount || 0,
      totalWonValue: wonValue._sum.amount || 0,
      winRate:
        totalDeals > 0
          ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) || 0
          : 0,
    };
  }
}
