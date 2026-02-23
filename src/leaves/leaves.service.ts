import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeaveDto,
  UpdateLeaveDto,
  QueryLeavesDto,
  RejectLeaveDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService) {}

  // Create a new leave request
  async create(companyId: string, userId: string, dto: CreateLeaveDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    // Check for overlapping leaves
    const overlapping = await this.prisma.leave.findFirst({
      where: {
        companyId,
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'You already have a leave request for this period',
      );
    }

    return this.prisma.leave.create({
      data: {
        type: dto.type,
        startDate,
        endDate,
        days: dto.days,
        reason: dto.reason,
        userId,
        companyId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Find all leaves with filters
  async findAll(companyId: string, query: QueryLeavesDto) {
    const {
      search,
      status,
      type,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.LeaveWhereInput = {
      companyId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leave.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find one leave by id
  async findOne(companyId: string, id: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    return leave;
  }

  // Update a leave request (only pending can be updated)
  async update(
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateLeaveDto,
  ) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own leave requests',
      );
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending leave requests can be updated',
      );
    }

    const data: Prisma.LeaveUpdateInput = {};

    if (dto.type) data.type = dto.type;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.days) data.days = dto.days;
    if (dto.reason !== undefined) data.reason = dto.reason;

    return this.prisma.leave.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Approve a leave request
  async approve(companyId: string, id: string, approverId: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending leave requests can be approved',
      );
    }

    // Update leave balance
    const year = new Date(leave.startDate).getFullYear();

    if (leave.type === 'ANNUAL') {
      await this.prisma.leaveBalance.upsert({
        where: {
          userId_companyId_year: {
            userId: leave.userId,
            companyId,
            year,
          },
        },
        update: {
          annualUsed: { increment: leave.days },
        },
        create: {
          userId: leave.userId,
          companyId,
          year,
          annualTotal: 20,
          annualUsed: leave.days,
        },
      });
    } else if (leave.type === 'SICK') {
      await this.prisma.leaveBalance.upsert({
        where: {
          userId_companyId_year: {
            userId: leave.userId,
            companyId,
            year,
          },
        },
        update: {
          sickUsed: { increment: leave.days },
        },
        create: {
          userId: leave.userId,
          companyId,
          year,
          sickUsed: leave.days,
        },
      });
    } else if (leave.type === 'UNPAID') {
      await this.prisma.leaveBalance.upsert({
        where: {
          userId_companyId_year: {
            userId: leave.userId,
            companyId,
            year,
          },
        },
        update: {
          unpaidUsed: { increment: leave.days },
        },
        create: {
          userId: leave.userId,
          companyId,
          year,
          unpaidUsed: leave.days,
        },
      });
    }

    return this.prisma.leave.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Reject a leave request
  async reject(
    companyId: string,
    id: string,
    approverId: string,
    dto: RejectLeaveDto,
  ) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending leave requests can be rejected',
      );
    }

    return this.prisma.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: dto.rejectionNote,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Cancel a leave request
  async cancel(companyId: string, id: string, userId: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.userId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own leave requests',
      );
    }

    if (!['PENDING', 'APPROVED'].includes(leave.status)) {
      throw new BadRequestException('This leave request cannot be cancelled');
    }

    // If approved, reverse the balance
    if (leave.status === 'APPROVED') {
      const year = new Date(leave.startDate).getFullYear();

      if (leave.type === 'ANNUAL') {
        await this.prisma.leaveBalance.update({
          where: {
            userId_companyId_year: {
              userId: leave.userId,
              companyId,
              year,
            },
          },
          data: {
            annualUsed: { decrement: leave.days },
          },
        });
      } else if (leave.type === 'SICK') {
        await this.prisma.leaveBalance.update({
          where: {
            userId_companyId_year: {
              userId: leave.userId,
              companyId,
              year,
            },
          },
          data: {
            sickUsed: { decrement: leave.days },
          },
        });
      } else if (leave.type === 'UNPAID') {
        await this.prisma.leaveBalance.update({
          where: {
            userId_companyId_year: {
              userId: leave.userId,
              companyId,
              year,
            },
          },
          data: {
            unpaidUsed: { decrement: leave.days },
          },
        });
      }
    }

    return this.prisma.leave.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  // Delete a leave request (only pending)
  async remove(companyId: string, id: string, userId: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
    });

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    if (leave.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own leave requests',
      );
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending leave requests can be deleted',
      );
    }

    await this.prisma.leave.delete({ where: { id } });
    return { success: true };
  }

  // Get leave balance for a user
  async getBalance(companyId: string, userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    let balance = await this.prisma.leaveBalance.findUnique({
      where: {
        userId_companyId_year: {
          userId,
          companyId,
          year: targetYear,
        },
      },
    });

    // Create default balance if not exists
    if (!balance) {
      balance = await this.prisma.leaveBalance.create({
        data: {
          userId,
          companyId,
          year: targetYear,
          annualTotal: 20,
          annualUsed: 0,
          annualCarried: 0,
          sickTotal: 0,
          sickUsed: 0,
          unpaidUsed: 0,
        },
      });
    }

    return {
      year: targetYear,
      annual: {
        total: balance.annualTotal + balance.annualCarried,
        used: balance.annualUsed,
        remaining:
          balance.annualTotal + balance.annualCarried - balance.annualUsed,
        carried: balance.annualCarried,
      },
      sick: {
        used: balance.sickUsed,
      },
      unpaid: {
        used: balance.unpaidUsed,
      },
    };
  }

  // Get my leaves
  async getMyLeaves(companyId: string, userId: string, query: QueryLeavesDto) {
    return this.findAll(companyId, { ...query, userId });
  }

  // Get summary stats
  async getSummary(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [pending, approvedThisMonth, onLeaveToday] = await Promise.all([
      this.prisma.leave.count({
        where: { companyId, status: 'PENDING' },
      }),
      this.prisma.leave.count({
        where: {
          companyId,
          status: 'APPROVED',
          approvedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.leave.count({
        where: {
          companyId,
          status: 'APPROVED',
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
    ]);

    return {
      pending,
      approvedThisMonth,
      onLeaveToday,
    };
  }
}
