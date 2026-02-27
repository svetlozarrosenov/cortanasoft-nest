import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDealDto,
  UpdateDealDto,
  QueryDealsDto,
  CreateDealTaskDto,
  UpdateDealTaskDto,
} from './dto';
import { Prisma, DealStatus } from '@prisma/client';

const DEAL_INCLUDE = {
  customer: {
    select: {
      id: true,
      type: true,
      companyName: true,
      firstName: true,
      lastName: true,
    },
  },
  contact: {
    select: {
      id: true,
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
};

const TASK_INCLUDE = {
  assignedTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

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
      include: DEAL_INCLUDE,
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
          ...DEAL_INCLUDE,
          _count: { select: { tasks: true } },
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
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            jobTitle: true,
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
        tasks: {
          include: TASK_INCLUDE,
          orderBy: [{ isDone: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        },
        _count: { select: { tasks: true } },
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
        ...DEAL_INCLUDE,
        _count: { select: { tasks: true } },
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
        ...DEAL_INCLUDE,
        _count: { select: { tasks: true } },
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

  // ==================== KANBAN ====================

  async findAllForKanban(companyId: string) {
    return this.prisma.deal.findMany({
      where: { companyId, isActive: true },
      include: {
        ...DEAL_INCLUDE,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }

  // ==================== DEAL TASKS ====================

  async createTask(
    companyId: string,
    dealId: string,
    dto: CreateDealTaskDto,
    userId?: string,
  ) {
    await this.findOne(companyId, dealId);

    return this.prisma.dealTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedToId: dto.assignedToId,
        dealId,
        companyId,
        createdById: userId,
      },
      include: TASK_INCLUDE,
    });
  }

  async findDealTasks(companyId: string, dealId: string) {
    await this.findOne(companyId, dealId);

    return this.prisma.dealTask.findMany({
      where: { dealId, companyId },
      include: TASK_INCLUDE,
      orderBy: [{ isDone: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateTask(
    companyId: string,
    dealId: string,
    taskId: string,
    dto: UpdateDealTaskDto,
  ) {
    const task = await this.prisma.dealTask.findFirst({
      where: { id: taskId, dealId, companyId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dealTask.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.assignedToId !== undefined && {
          assignedToId: dto.assignedToId,
        }),
        ...(dto.isDone !== undefined && {
          isDone: dto.isDone,
          completedAt: dto.isDone ? new Date() : null,
        }),
      },
      include: TASK_INCLUDE,
    });
  }

  async toggleTask(companyId: string, dealId: string, taskId: string) {
    const task = await this.prisma.dealTask.findFirst({
      where: { id: taskId, dealId, companyId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const isDone = !task.isDone;
    return this.prisma.dealTask.update({
      where: { id: taskId },
      data: { isDone, completedAt: isDone ? new Date() : null },
      include: TASK_INCLUDE,
    });
  }

  async removeTask(companyId: string, dealId: string, taskId: string) {
    const task = await this.prisma.dealTask.findFirst({
      where: { id: taskId, dealId, companyId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dealTask.delete({ where: { id: taskId } });
  }
}
