import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { computeWorkingDays } from './working-days.util';
import { checkPermission } from '../common/guards/permissions.guard';
import { RolePermissions } from '../common/config/permissions.config';

// Контекст на четящия — за GDPR маскиране на чужди чувствителни данни
export interface LeaveViewer {
  userId: string;
  privileged: boolean;
}
import {
  CreateLeaveDto,
  UpdateLeaveDto,
  QueryLeavesDto,
  RejectLeaveDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private push: PushNotificationsService,
  ) {}

  // Намира потребителите с право да управляват отпуски (за известия до одобряващите)
  private async findApproverIds(
    companyId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: { role: true },
    });
    return members
      .filter((m) => {
        if (excludeUserId && m.userId === excludeUserId) return false;
        const perms = m.role?.permissions as unknown as RolePermissions;
        return checkPermission(perms, 'hr', 'leaves', 'edit');
      })
      .map((m) => m.userId);
  }

  private leaveTypeLabel(type: string): string {
    const map: Record<string, string> = {
      ANNUAL: 'платен отпуск',
      SICK: 'болничен',
      UNPAID: 'неплатен отпуск',
      MATERNITY: 'майчинство',
      PATERNITY: 'бащинство',
      OTHER: 'отпуск',
    };
    return map[type] || 'отпуск';
  }

  private fmtDate(d: Date): string {
    return new Date(d).toLocaleDateString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Изисквания за обосновка/документ според типа отпуск
  private validateLeaveDetails(dto: {
    type: string;
    reason?: string;
    documentNumber?: string;
    attachmentKey?: string;
  }) {
    if (
      (dto.type === 'UNPAID' || dto.type === 'OTHER') &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'Причината е задължителна за неплатен отпуск и „друг" тип',
      );
    }

    if (dto.type === 'SICK' && !dto.documentNumber?.trim() && !dto.attachmentKey) {
      throw new BadRequestException(
        'За болничен е необходим номер на болничен лист или прикачен документ',
      );
    }
  }

  // Има ли четящият право да управлява отпуски (HR/мениджър) — вижда чужди детайли
  async isPrivileged(companyId: string, userId: string): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { role: true },
    });
    if (company?.role === 'OWNER') return true; // super-admin компания

    const uc = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { role: true },
    });
    if (!uc?.role) return false;
    const perms = uc.role.permissions as unknown as RolePermissions;
    return checkPermission(perms, 'hr', 'leaves', 'edit');
  }

  // Построява контекста на четящия
  async buildViewer(companyId: string, userId: string): Promise<LeaveViewer> {
    return { userId, privileged: await this.isPrivileged(companyId, userId) };
  }

  // Скрива чувствителните данни (причина, документ) за чужди молби пред непривилегировани
  private maskLeave<T extends { userId: string }>(
    leave: T,
    viewer?: LeaveViewer,
  ): T {
    if (!viewer) return leave;
    if (viewer.privileged || leave.userId === viewer.userId) return leave;
    return {
      ...leave,
      reason: null,
      documentNumber: null,
      attachmentKey: null,
      attachmentName: null,
    };
  }

  // Реален брой дни за приспадане по години (половин ден → 0.5)
  private effectiveByYear(leave: {
    startDate: Date;
    endDate: Date;
    halfDay: boolean;
  }): Record<number, number> {
    const { byYear } = computeWorkingDays(leave.startDate, leave.endDate);
    if (leave.halfDay) {
      const years = Object.keys(byYear);
      const year = years.length
        ? Number(years[0])
        : new Date(leave.startDate).getUTCFullYear();
      return { [year]: 0.5 };
    }
    return byYear;
  }

  // Гарантира наличие на балансов ред за годината с актуален annualTotal.
  // Ефективната квота = ръчна корекция (override) или подразбиращата се.
  private async ensureBalanceRow(
    companyId: string,
    userId: string,
    year: number,
  ) {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { userId_companyId_year: { userId, companyId, year } },
    });
    const resolved = await this.resolveAnnualLeaveDays(companyId, userId);
    const effectiveTotal = existing?.annualTotalOverride ?? resolved;

    return this.prisma.leaveBalance.upsert({
      where: { userId_companyId_year: { userId, companyId, year } },
      update: { annualTotal: effectiveTotal },
      create: {
        userId,
        companyId,
        year,
        annualTotal: effectiveTotal,
        annualUsed: 0,
        annualCarried: 0,
        sickTotal: 0,
        sickUsed: 0,
        unpaidUsed: 0,
      },
    });
  }

  // Прилага промяна (delta) към съответния counter за дадена година
  private async applyBalanceDelta(
    companyId: string,
    userId: string,
    year: number,
    type: string,
    delta: number,
  ) {
    const field =
      type === 'ANNUAL'
        ? 'annualUsed'
        : type === 'SICK'
          ? 'sickUsed'
          : type === 'UNPAID'
            ? 'unpaidUsed'
            : null;
    if (!field) return; // MATERNITY/PATERNITY/OTHER не пипат баланс
    await this.ensureBalanceRow(companyId, userId, year);
    await this.prisma.leaveBalance.update({
      where: { userId_companyId_year: { userId, companyId, year } },
      data: { [field]: { increment: delta } },
    });
  }

  // Create a new leave request
  async create(companyId: string, actorId: string, dto: CreateLeaveDto) {
    const privileged = await this.isPrivileged(companyId, actorId);

    // Подаване от името на служител — само за HR/мениджъри
    let userId = actorId;
    if (dto.userId && dto.userId !== actorId) {
      if (!privileged) {
        throw new ForbiddenException(
          'Нямате право да подавате молба от името на друг служител',
        );
      }
      const target = await this.prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: dto.userId, companyId } },
        select: { id: true },
      });
      if (!target) {
        throw new NotFoundException('Служителят не е намерен в компанията');
      }
      userId = dto.userId;
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    // Забрана за заявка с начална дата в миналото (HR/мениджъри могат да въвеждат със задна дата)
    if (!privileged) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        throw new BadRequestException(
          'Началната дата не може да е в миналото',
        );
      }
    }

    // Сървърът сам пресмята работните дни (без уикенди и официални празници) —
    // не се доверяваме на стойността от клиента
    const { total: workingDays } = computeWorkingDays(startDate, endDate);
    if (workingDays === 0) {
      throw new BadRequestException(
        'Периодът не съдържа работни дни (уикенди/официални празници)',
      );
    }

    // Половин ден е възможен само за заявка от един работен ден
    if (dto.halfDay && workingDays !== 1) {
      throw new BadRequestException(
        'Половин ден може да се заяви само за един работен ден',
      );
    }

    // Изисквания за обосновка/документ според типа
    this.validateLeaveDetails(dto);

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

    const created = await this.prisma.leave.create({
      data: {
        type: dto.type,
        startDate,
        endDate,
        days: workingDays,
        halfDay: dto.halfDay ?? false,
        reason: dto.reason,
        documentNumber: dto.documentNumber,
        attachmentKey: dto.attachmentKey,
        attachmentName: dto.attachmentName,
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

    // Извести одобряващите за новата молба (без подателя)
    const approverIds = await this.findApproverIds(companyId, userId);
    if (approverIds.length) {
      const who = `${created.user.firstName} ${created.user.lastName}`;
      await this.push.sendToUsers(approverIds, {
        title: 'Нова молба за отпуск',
        body: `${who} заяви ${this.leaveTypeLabel(created.type)} (${this.fmtDate(created.startDate)} – ${this.fmtDate(created.endDate)})`,
        url: `/dashboard/${companyId}/hr/leaves`,
        tag: `leave-${created.id}`,
      });
    }

    return created;
  }

  // Find all leaves with filters
  async findAll(companyId: string, query: QueryLeavesDto, viewer?: LeaveViewer) {
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
      data: data.map((l) => this.maskLeave(l, viewer)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find one leave by id
  async findOne(companyId: string, id: string, viewer?: LeaveViewer) {
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

    return this.maskLeave(leave, viewer);
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

    // Валидирай според крайния тип/обосновка/документ
    this.validateLeaveDetails({
      type: dto.type ?? leave.type,
      reason: dto.reason !== undefined ? dto.reason : leave.reason ?? undefined,
      documentNumber:
        dto.documentNumber !== undefined
          ? dto.documentNumber
          : leave.documentNumber ?? undefined,
      attachmentKey:
        dto.attachmentKey !== undefined
          ? dto.attachmentKey
          : leave.attachmentKey ?? undefined,
    });

    const data: Prisma.LeaveUpdateInput = {};

    if (dto.type) data.type = dto.type;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.days) data.days = dto.days;
    if (dto.halfDay !== undefined) data.halfDay = dto.halfDay;
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.documentNumber !== undefined) data.documentNumber = dto.documentNumber;
    if (dto.attachmentKey !== undefined) data.attachmentKey = dto.attachmentKey;
    if (dto.attachmentName !== undefined)
      data.attachmentName = dto.attachmentName;

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

    if (leave.userId === approverId) {
      throw new ForbiddenException(
        'Не можете да одобрите собствената си молба за отпуск',
      );
    }

    // Реален брой дни за приспадане, разбит по години
    const byYear = this.effectiveByYear(leave);

    // За платен отпуск — провери остатъка за всяка засегната година
    if (leave.type === 'ANNUAL') {
      for (const [yearStr, days] of Object.entries(byYear)) {
        const year = Number(yearStr);
        const row = await this.ensureBalanceRow(companyId, leave.userId, year);
        const remaining = row.annualTotal + row.annualCarried - row.annualUsed;
        if (remaining < days) {
          throw new BadRequestException(
            `Недостатъчен остатък платен отпуск за ${year} г.: остават ${remaining} дни, заявени ${days}`,
          );
        }
      }
    }

    // Приложи приспадането по години
    for (const [yearStr, days] of Object.entries(byYear)) {
      await this.applyBalanceDelta(
        companyId,
        leave.userId,
        Number(yearStr),
        leave.type,
        days,
      );
    }

    const approved = await this.prisma.leave.update({
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

    await this.push.sendToUser(approved.userId, {
      title: 'Одобрена молба за отпуск',
      body: `Вашият ${this.leaveTypeLabel(approved.type)} (${this.fmtDate(approved.startDate)} – ${this.fmtDate(approved.endDate)}) е одобрен`,
      url: `/dashboard/${companyId}/hr/leaves`,
      tag: `leave-${approved.id}`,
    });

    return approved;
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

    if (leave.userId === approverId) {
      throw new ForbiddenException(
        'Не можете да отхвърлите собствената си молба за отпуск',
      );
    }

    const rejected = await this.prisma.leave.update({
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

    await this.push.sendToUser(rejected.userId, {
      title: 'Отхвърлена молба за отпуск',
      body: `Вашият ${this.leaveTypeLabel(rejected.type)} (${this.fmtDate(rejected.startDate)} – ${this.fmtDate(rejected.endDate)}) е отхвърлен`,
      url: `/dashboard/${companyId}/hr/leaves`,
      tag: `leave-${rejected.id}`,
    });

    return rejected;
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

    // Ако е била одобрена — върни приспаднатите дни по години
    if (leave.status === 'APPROVED') {
      const byYear = this.effectiveByYear(leave);
      for (const [yearStr, days] of Object.entries(byYear)) {
        await this.applyBalanceDelta(
          companyId,
          leave.userId,
          Number(yearStr),
          leave.type,
          -days,
        );
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

    if (leave.attachmentKey) {
      await this.uploads.deleteFile(leave.attachmentKey);
    }

    await this.prisma.leave.delete({ where: { id } });
    return { success: true };
  }

  // Качване на придружаващ документ (болничен лист, молба и т.н.)
  async uploadDocument(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; name: string }> {
    const { key } = await this.uploads.uploadFile(companyId, 'leaves', file);
    return { key, name: file.originalname };
  }

  // Поток към прикачения документ за сваляне/преглед
  async getDocument(companyId: string, id: string, viewer?: LeaveViewer) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, companyId },
      select: { attachmentKey: true, attachmentName: true, userId: true },
    });

    if (!leave?.attachmentKey) {
      throw new NotFoundException('Документ не е намерен');
    }

    if (viewer && !viewer.privileged && leave.userId !== viewer.userId) {
      throw new ForbiddenException('Нямате достъп до този документ');
    }

    const file = await this.uploads.getFile(leave.attachmentKey);
    return { ...file, fileName: leave.attachmentName ?? 'document' };
  }

  // Resolve annual leave days: employee override > company default > 20
  private async resolveAnnualLeaveDays(companyId: string, userId: string): Promise<number> {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { maxVacationDays: true },
    });
    if (userCompany?.maxVacationDays != null) return userCompany.maxVacationDays;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultAnnualLeaveDays: true },
    });
    return company?.defaultAnnualLeaveDays ?? 20;
  }

  // Get leave balance for a user (актуализира застоялата квота при четене)
  async getBalance(companyId: string, userId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const balance = await this.ensureBalanceRow(companyId, userId, targetYear);

    return {
      year: targetYear,
      annual: {
        total: balance.annualTotal + balance.annualCarried,
        used: balance.annualUsed,
        remaining:
          balance.annualTotal + balance.annualCarried - balance.annualUsed,
        carried: balance.annualCarried,
        override: balance.annualTotalOverride,
      },
      sick: {
        used: balance.sickUsed,
      },
      unpaid: {
        used: balance.unpaidUsed,
      },
    };
  }

  // Ръчна корекция на баланса: пренос от минала година и/или квота за годината
  async adjustBalance(
    companyId: string,
    userId: string,
    year: number,
    dto: { annualCarried?: number; annualTotalOverride?: number | null },
  ) {
    const isEmployee = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { id: true },
    });
    if (!isEmployee) {
      throw new NotFoundException('Служителят не е намерен в компанията');
    }

    await this.ensureBalanceRow(companyId, userId, year);

    const data: Prisma.LeaveBalanceUpdateInput = {};
    if (dto.annualCarried !== undefined) {
      if (dto.annualCarried < 0) {
        throw new BadRequestException('Пренесените дни не може да са отрицателни');
      }
      data.annualCarried = dto.annualCarried;
    }
    if (dto.annualTotalOverride !== undefined) {
      if (dto.annualTotalOverride !== null && dto.annualTotalOverride < 0) {
        throw new BadRequestException('Квотата не може да е отрицателна');
      }
      data.annualTotalOverride = dto.annualTotalOverride;
      // Синхронизирай кешираната квота веднага
      data.annualTotal =
        dto.annualTotalOverride ??
        (await this.resolveAnnualLeaveDays(companyId, userId));
    }

    await this.prisma.leaveBalance.update({
      where: { userId_companyId_year: { userId, companyId, year } },
      data,
    });

    return this.getBalance(companyId, userId, year);
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
