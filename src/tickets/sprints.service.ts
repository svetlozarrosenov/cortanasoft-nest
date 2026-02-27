import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { ManageSprintTicketsDto } from './dto/manage-sprint-tickets.dto';
import { ManageSprintMembersDto } from './dto/manage-sprint-members.dto';

const MEMBER_INCLUDE = {
  user: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

const SPRINT_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  members: {
    include: MEMBER_INCLUDE,
  },
  _count: {
    select: { tickets: true, members: true },
  },
};

const SPRINT_DETAIL_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  members: {
    include: MEMBER_INCLUDE,
  },
  tickets: {
    include: {
      assignee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [
      { status: 'asc' as const },
      { priority: 'desc' as const },
    ],
  },
  _count: {
    select: { tickets: true, members: true },
  },
};

@Injectable()
export class SprintsService {
  constructor(private prisma: PrismaService) {}

  // ==================== CRUD ====================

  async create(companyId: string, userId: string, dto: CreateSprintDto) {
    const sprint = await this.prisma.sprint.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        hoursPerDay: dto.hoursPerDay,
        companyId,
        createdById: userId,
        ...(dto.memberIds && dto.memberIds.length > 0
          ? {
              members: {
                create: dto.memberIds.map((memberId) => ({
                  userId: memberId,
                  companyId,
                })),
              },
            }
          : {}),
      },
      include: SPRINT_INCLUDE,
    });

    return sprint;
  }

  async findAll(companyId: string) {
    const sprints = await this.prisma.sprint.findMany({
      where: { companyId },
      include: {
        ...SPRINT_INCLUDE,
        tickets: {
          select: {
            id: true,
            status: true,
            estimatedHours: true,
            actualHours: true,
            assigneeId: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Enrich each sprint with computed progress
    return sprints.map((sprint) => {
      const tickets = sprint.tickets || [];
      const totalTickets = tickets.length;
      const completedTickets = tickets.filter((t) => t.status === 'DONE').length;
      const totalEstimatedHours = tickets.reduce(
        (sum, t) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0),
        0,
      );
      const totalActualHours = tickets.reduce(
        (sum, t) => sum + (t.actualHours ? Number(t.actualHours) : 0),
        0,
      );
      const percentComplete = totalTickets > 0
        ? Math.round((completedTickets / totalTickets) * 100)
        : 0;

      // Remove full ticket array from response to keep it light
      const { tickets: _tickets, ...sprintData } = sprint;

      return {
        ...sprintData,
        progress: {
          totalTickets,
          completedTickets,
          totalEstimatedHours,
          totalActualHours,
          percentComplete,
        },
      };
    });
  }

  async findOne(companyId: string, id: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, companyId },
      include: SPRINT_DETAIL_INCLUDE,
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    return sprint;
  }

  async update(companyId: string, id: string, dto: UpdateSprintDto) {
    const existing = await this.prisma.sprint.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Sprint not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.hoursPerDay !== undefined) updateData.hoursPerDay = dto.hoursPerDay;

    await this.prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    // Update members if provided
    if (dto.memberIds !== undefined) {
      // Replace all members: delete existing, create new
      await this.prisma.sprintMember.deleteMany({ where: { sprintId: id } });
      if (dto.memberIds.length > 0) {
        await this.prisma.sprintMember.createMany({
          data: dto.memberIds.map((userId) => ({
            sprintId: id,
            userId,
            companyId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Recalculate end date if relevant fields changed
    if (dto.startDate !== undefined || dto.memberIds !== undefined || dto.hoursPerDay !== undefined) {
      await this.calculateEndDate(id);
    }

    return this.prisma.sprint.findFirst({
      where: { id },
      include: SPRINT_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.sprint.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.sprint.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Ticket Management ====================

  async addTickets(companyId: string, sprintId: string, dto: ManageSprintTicketsDto) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, companyId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.ticket.updateMany({
      where: {
        id: { in: dto.ticketIds },
        companyId,
      },
      data: { sprintId },
    });

    // Recalculate end date
    await this.calculateEndDate(sprintId);

    return this.findOne(companyId, sprintId);
  }

  async removeTickets(companyId: string, sprintId: string, dto: ManageSprintTicketsDto) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, companyId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.ticket.updateMany({
      where: {
        id: { in: dto.ticketIds },
        companyId,
        sprintId,
      },
      data: { sprintId: null },
    });

    // Recalculate end date
    await this.calculateEndDate(sprintId);

    return this.findOne(companyId, sprintId);
  }

  // ==================== Member Management ====================

  async addMembers(companyId: string, sprintId: string, dto: ManageSprintMembersDto) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, companyId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.sprintMember.createMany({
      data: dto.memberIds.map((userId) => ({
        sprintId,
        userId,
        companyId,
      })),
      skipDuplicates: true,
    });

    // Recalculate end date
    await this.calculateEndDate(sprintId);

    return this.findOne(companyId, sprintId);
  }

  async removeMembers(companyId: string, sprintId: string, dto: ManageSprintMembersDto) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, companyId },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.sprintMember.deleteMany({
      where: {
        sprintId,
        userId: { in: dto.memberIds },
      },
    });

    // Recalculate end date
    await this.calculateEndDate(sprintId);

    return this.findOne(companyId, sprintId);
  }

  // ==================== End Date Calculation ====================

  async calculateEndDate(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tickets: {
          where: { status: { not: 'CANCELLED' } },
          select: { estimatedHours: true, assigneeId: true },
        },
        members: true,
      },
    });

    if (!sprint || !sprint.startDate) {
      return null;
    }

    const totalEstimatedHours = sprint.tickets.reduce(
      (sum, t) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0),
      0,
    );

    if (totalEstimatedHours === 0) {
      await this.prisma.sprint.update({
        where: { id: sprintId },
        data: { endDate: sprint.startDate },
      });
      return { endDate: sprint.startDate, totalEstimatedHours: 0, workersCount: 1 };
    }

    // Use members count, fall back to unique ticket assignees
    const uniqueAssignees = new Set(
      sprint.tickets.map((t) => t.assigneeId).filter(Boolean),
    );

    const workersCount = sprint.members.length > 0
      ? sprint.members.length
      : Math.max(uniqueAssignees.size, 1);
    const hoursPerDay = sprint.hoursPerDay ? Number(sprint.hoursPerDay) : 8;
    const workingDays = Math.ceil(totalEstimatedHours / (workersCount * hoursPerDay));

    const endDate = this.addBusinessDays(new Date(sprint.startDate), workingDays);

    await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { endDate },
    });

    return { endDate, totalEstimatedHours, workersCount };
  }

  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;

    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }

  // ==================== Progress ====================

  async getProgress(companyId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, companyId },
      include: {
        tickets: {
          select: {
            id: true,
            status: true,
            estimatedHours: true,
            actualHours: true,
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const tickets = sprint.tickets;
    const totalTickets = tickets.length;
    const completedTickets = tickets.filter((t) => t.status === 'DONE').length;

    const totalEstimatedHours = tickets.reduce(
      (sum, t) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0),
      0,
    );

    // Get total logged hours from time_logs
    const timeLogResult = await this.prisma.timeLog.aggregate({
      where: {
        ticketId: { in: tickets.map((t) => t.id) },
      },
      _sum: { hours: true },
    });

    const totalLoggedHours = timeLogResult._sum.hours
      ? Number(timeLogResult._sum.hours)
      : 0;

    const percentComplete = totalTickets > 0
      ? Math.round((completedTickets / totalTickets) * 100)
      : 0;

    const hoursProgress = totalEstimatedHours > 0
      ? Math.round((totalLoggedHours / totalEstimatedHours) * 100)
      : 0;

    const byStatus: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
      CANCELLED: 0,
    };
    tickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });

    let daysRemaining: number | null = null;
    let isOverdue = false;

    if (sprint.endDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const end = new Date(sprint.endDate);
      end.setHours(0, 0, 0, 0);
      const diffMs = end.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isOverdue = daysRemaining < 0 && percentComplete < 100;
    }

    return {
      totalTickets,
      completedTickets,
      totalEstimatedHours,
      totalLoggedHours,
      percentComplete,
      hoursProgress,
      byStatus,
      membersCount: sprint._count.members,
      endDate: sprint.endDate,
      daysRemaining,
      isOverdue,
    };
  }
}
