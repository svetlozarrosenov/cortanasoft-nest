import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  QueryAttendanceDto,
} from './dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(
    companyId: string,
    currentUserId: string,
    dto: CreateAttendanceDto,
  ) {
    const userId = dto.userId || currentUserId;

    // Verify user is employee of company
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId },
    });

    if (!userCompany) {
      throw new BadRequestException('User is not an employee of this company');
    }

    // Check if attendance already exists for this user and date
    const date = new Date(dto.date);
    const existing = await this.prisma.attendance.findUnique({
      where: {
        companyId_userId_date: {
          companyId,
          userId,
          date,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Attendance record already exists for this date',
      );
    }

    // Calculate worked minutes if checkIn and checkOut are provided
    let workedMinutes: number | null = null;
    if (dto.checkIn && dto.checkOut) {
      const checkInTime = new Date(dto.checkIn);
      const checkOutTime = new Date(dto.checkOut);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      workedMinutes = Math.floor(diffMs / 60000) - (dto.breakMinutes || 0);
      if (workedMinutes < 0) workedMinutes = 0;
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        date,
        type: dto.type,
        status: dto.status,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : null,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : null,
        breakMinutes: dto.breakMinutes || 0,
        workedMinutes,
        overtimeMinutes: dto.overtimeMinutes || 0,
        notes: dto.notes,
        companyId,
        userId,
      },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return { ...attendance, user };
  }

  async findAll(companyId: string, query: QueryAttendanceDto) {
    const {
      userId,
      type,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    const where: any = { companyId };

    if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    const [total, attendances] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Enrich with user data
    const userIds = [...new Set(attendances.map((a) => a.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const enrichedAttendances = attendances.map((a) => ({
      ...a,
      user: usersMap.get(a.userId) || null,
    }));

    return {
      data: enrichedAttendances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: attendance.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    // Get approver info if exists
    let approvedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null = null;
    if (attendance.approvedById) {
      approvedBy = await this.prisma.user.findUnique({
        where: { id: attendance.approvedById },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    }

    return { ...attendance, user, approvedBy };
  }

  async update(companyId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // Calculate worked minutes if checkIn and checkOut are provided
    let workedMinutes = attendance.workedMinutes;
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : attendance.checkIn;
    const checkOut = dto.checkOut
      ? new Date(dto.checkOut)
      : attendance.checkOut;
    const breakMinutes = dto.breakMinutes ?? attendance.breakMinutes;

    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      workedMinutes = Math.floor(diffMs / 60000) - breakMinutes;
      if (workedMinutes < 0) workedMinutes = 0;
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        type: dto.type,
        status: dto.status,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        breakMinutes: dto.breakMinutes,
        workedMinutes,
        overtimeMinutes: dto.overtimeMinutes,
        notes: dto.notes,
      },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: updated.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return { ...updated, user };
  }

  async approve(companyId: string, id: string, approverId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        status: AttendanceStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  async reject(companyId: string, id: string, approverId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        status: AttendanceStatus.REJECTED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  async remove(companyId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, companyId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.prisma.attendance.delete({
      where: { id },
    });

    return { success: true, message: 'Attendance record deleted' };
  }

  // Get summary for a user for a date range
  async getSummary(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        companyId,
        userId,
        date: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
    });

    const summary = {
      totalDays: attendances.length,
      regularDays: 0,
      remoteDays: 0,
      halfDays: 0,
      sickLeaveDays: 0,
      vacationDays: 0,
      unpaidLeaveDays: 0,
      businessTripDays: 0,
      holidayDays: 0,
      overtimeDays: 0,
      totalWorkedMinutes: 0,
      totalOvertimeMinutes: 0,
    };

    for (const a of attendances) {
      switch (a.type) {
        case 'REGULAR':
          summary.regularDays++;
          break;
        case 'REMOTE':
          summary.remoteDays++;
          break;
        case 'HALF_DAY':
          summary.halfDays++;
          break;
        case 'SICK_LEAVE':
          summary.sickLeaveDays++;
          break;
        case 'VACATION':
          summary.vacationDays++;
          break;
        case 'UNPAID_LEAVE':
          summary.unpaidLeaveDays++;
          break;
        case 'BUSINESS_TRIP':
          summary.businessTripDays++;
          break;
        case 'HOLIDAY':
          summary.holidayDays++;
          break;
        case 'OVERTIME':
          summary.overtimeDays++;
          break;
      }

      if (a.workedMinutes) {
        summary.totalWorkedMinutes += a.workedMinutes;
      }
      summary.totalOvertimeMinutes += a.overtimeMinutes;
    }

    return summary;
  }

  // Check in for current user
  async checkIn(companyId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    let attendance = await this.prisma.attendance.findUnique({
      where: {
        companyId_userId_date: {
          companyId,
          userId,
          date: today,
        },
      },
    });

    if (attendance?.checkIn) {
      throw new ConflictException('Already checked in today');
    }

    if (attendance) {
      // Update existing record
      attendance = await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkIn: new Date() },
      });
    } else {
      // Create new record
      attendance = await this.prisma.attendance.create({
        data: {
          date: today,
          checkIn: new Date(),
          companyId,
          userId,
        },
      });
    }

    return attendance;
  }

  // Check out for current user
  async checkOut(companyId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        companyId_userId_date: {
          companyId,
          userId,
          date: today,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('No attendance record for today');
    }

    if (!attendance.checkIn) {
      throw new BadRequestException('Must check in before checking out');
    }

    if (attendance.checkOut) {
      throw new ConflictException('Already checked out today');
    }

    const checkOut = new Date();
    const diffMs = checkOut.getTime() - attendance.checkIn.getTime();
    const workedMinutes = Math.floor(diffMs / 60000) - attendance.breakMinutes;

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut,
        workedMinutes: workedMinutes > 0 ? workedMinutes : 0,
      },
    });

    return updated;
  }

  // Get today's status for current user
  async getTodayStatus(companyId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        companyId_userId_date: {
          companyId,
          userId,
          date: today,
        },
      },
    });

    return {
      date: today,
      hasRecord: !!attendance,
      isCheckedIn: !!attendance?.checkIn,
      isCheckedOut: !!attendance?.checkOut,
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      workedMinutes: attendance?.workedMinutes || null,
      type: attendance?.type || null,
    };
  }
}
