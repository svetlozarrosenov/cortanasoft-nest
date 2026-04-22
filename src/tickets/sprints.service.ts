import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { ManageSprintTicketsDto } from './dto/manage-sprint-tickets.dto';
import { ManageSprintMembersDto } from './dto/manage-sprint-members.dto';
import { SprintStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

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

  // Valid status transitions state machine
  private readonly validTransitions: Record<SprintStatus, SprintStatus[]> = {
    PLANNING: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  // ==================== CRUD ====================

  async create(companyId: string, userId: string, dto: CreateSprintDto) {
    const sprint = await this.prisma.sprint.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
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
            plannedStartDate: true,
            plannedEndDate: true,
            hoursPerDay: true,
            assigneeId: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Enrich each sprint with computed progress (effort-weighted, consistent with getProgress)
    return sprints.map((sprint) => {
      const tickets = sprint.tickets || [];
      const totalTickets = tickets.length;
      const completedTickets = tickets.filter((t) => t.status === 'DONE').length;

      const weights = tickets.map((t) => ({ t, weight: computeEffortWeight(t) }));
      const totalEstimatedHours = weights.reduce((sum, w) => sum + w.weight, 0);
      const completedWeight = weights
        .filter(({ t }) => t.status === 'DONE')
        .reduce((sum, w) => sum + w.weight, 0);

      const totalActualHours = tickets.reduce(
        (sum, t) => sum + (t.actualHours ? Number(t.actualHours) : 0),
        0,
      );
      const percentComplete = totalEstimatedHours > 0
        ? Math.round((completedWeight / totalEstimatedHours) * 100)
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

    // Validate status transition
    if (dto.status !== undefined && dto.status !== existing.status) {
      const allowedTargets = this.validTransitions[existing.status] || [];
      if (!allowedTargets.includes(dto.status)) {
        throw new BadRequestException(ErrorMessages.sprints.invalidStatusTransition);
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

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

    // Recalculate end date if relevant fields changed — UNLESS user explicitly set endDate
    // (manual value wins; auto-calc would overwrite it).
    if (
      dto.endDate === undefined &&
      (dto.startDate !== undefined || dto.memberIds !== undefined)
    ) {
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

    // Auto-add assignees of added tickets as sprint members
    const addedTickets = await this.prisma.ticket.findMany({
      where: { id: { in: dto.ticketIds }, companyId, sprintId },
      select: { assigneeId: true },
    });
    const assigneeIds = Array.from(
      new Set(addedTickets.map((t) => t.assigneeId).filter((id): id is string => !!id)),
    );
    if (assigneeIds.length > 0) {
      await this.prisma.sprintMember.createMany({
        data: assigneeIds.map((userId) => ({ sprintId, userId, companyId })),
        skipDuplicates: true,
      });
    }

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

  // Sprint's endDate = max(ticket.plannedEndDate) of non-CANCELLED tickets.
  // Tickets are the source of truth now — they carry their own hoursPerDay +
  // workingDaysPerWeek and derive their own end dates independently.
  async calculateEndDate(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tickets: {
          where: { status: { not: 'CANCELLED' } },
          select: { plannedEndDate: true },
        },
      },
    });

    if (!sprint) return null;

    const endDates = sprint.tickets.map((t) => t.plannedEndDate.getTime());
    const maxEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : null;
    const endDate = maxEnd ?? sprint.startDate ?? null;

    await this.prisma.sprint.update({
      where: { id: sprintId },
      data: { endDate },
    });

    return { endDate, ticketCount: sprint.tickets.length };
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
            plannedStartDate: true,
            plannedEndDate: true,
            hoursPerDay: true,
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

    const weights = tickets.map((t) => ({ t, weight: computeEffortWeight(t) }));
    const totalEstimatedHours = weights.reduce((sum, w) => sum + w.weight, 0);
    const completedWeight = weights
      .filter(({ t }) => t.status === 'DONE')
      .reduce((sum, w) => sum + w.weight, 0);

    const timeLogResult = await this.prisma.timeLog.aggregate({
      where: { ticketId: { in: tickets.map((t) => t.id) } },
      _sum: { hours: true },
    });

    const totalLoggedHours = timeLogResult._sum.hours
      ? Number(timeLogResult._sum.hours)
      : 0;

    // Effort-weighted progress: % of total estimated hours that are in DONE tasks.
    // Every task has a non-zero weight (default = 1 working day) so percentComplete is
    // stable even when some tickets miss estimates.
    const percentComplete = totalEstimatedHours > 0
      ? Math.round((completedWeight / totalEstimatedHours) * 100)
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

    // ===== Projected completion (based on actual task scheduling, not capacity math) =====
    // "Когато всички задачи свършат" = max(plannedEndDate) of ACTIVE (not DONE/CANCELLED) tickets
    const activeTickets = tickets.filter(
      (t) => t.status !== 'DONE' && t.status !== 'CANCELLED',
    );
    const scheduledActive = activeTickets.filter((t) => t.plannedEndDate);
    const unscheduledCount = activeTickets.length - scheduledActive.length;

    let projectedEndDate: Date | null = null;
    if (scheduledActive.length > 0) {
      projectedEndDate = new Date(
        Math.max(...scheduledActive.map((t) => new Date(t.plannedEndDate!).getTime())),
      );
      projectedEndDate.setHours(0, 0, 0, 0);
    }

    // Working days between today and projectedEndDate (skip weekends)
    let workingDaysRemaining: number | null = null;
    if (projectedEndDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      workingDaysRemaining = countWorkingDays(today, projectedEndDate);
    }

    // Capacity info (informational — NOT used to determine projection).
    // Sprint-level hoursPerDay no longer exists; use 8 as team-average default for
    // "available capacity" display. Individual ticket end dates use each ticket's own.
    const hoursPerDay = 8;
    const membersCount = sprint._count.members;
    // Work still to do = sum of effort weights of non-DONE/non-CANCELLED tickets.
    // Decoupled from logged hours so DONE tickets with extra logged time don't skew this.
    const remainingEffortHours = weights
      .filter(({ t }) => t.status !== 'DONE' && t.status !== 'CANCELLED')
      .reduce((sum, w) => sum + w.weight, 0);
    const availableCapacityHours =
      workingDaysRemaining !== null && workingDaysRemaining > 0
        ? membersCount * hoursPerDay * workingDaysRemaining
        : 0;
    const isOverBudget = projectedEndDate && sprint.endDate
      ? projectedEndDate.getTime() > new Date(sprint.endDate).getTime()
      : false;

    return {
      totalTickets,
      completedTickets,
      totalEstimatedHours,
      totalLoggedHours,
      percentComplete,
      hoursProgress,
      byStatus,
      membersCount,
      hoursPerDay,
      endDate: sprint.endDate,
      daysRemaining,
      isOverdue,
      // New projection metrics
      projectedEndDate,
      workingDaysRemaining,
      unscheduledCount,
      remainingEffortHours,
      availableCapacityHours,
      isOverBudget,
      isUnderCapacity:
        availableCapacityHours > 0 && availableCapacityHours < remainingEffortHours,
    };
  }
}

// Count working days between two dates (inclusive of end, exclusive of start if same day)
function countWorkingDays(from: Date, to: Date): number {
  if (to < from) return 0;
  let days = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Effort weight per ticket. Priority:
//   1. estimatedHours (explicit author intent)
//   2. plannedStartDate..plannedEndDate × ticket.hoursPerDay (derived from schedule)
//   3. ticket.hoursPerDay (1 working day) — so every ticket counts in the weighted total
// Uses each ticket's own hoursPerDay (default 8) — no sprint-level override anymore.
function computeEffortWeight(
  t: {
    estimatedHours?: unknown;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    hoursPerDay?: unknown;
  },
): number {
  if (t.estimatedHours) return Number(t.estimatedHours);
  const hoursPerDay = t.hoursPerDay ? Number(t.hoursPerDay) : 8;
  if (t.plannedStartDate && t.plannedEndDate) {
    const ms = new Date(t.plannedEndDate).getTime() - new Date(t.plannedStartDate).getTime();
    const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
    return days * hoursPerDay;
  }
  return hoursPerDay;
}
