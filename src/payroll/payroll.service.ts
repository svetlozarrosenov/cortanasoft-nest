import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrSettingsService } from '../hr-settings/hr-settings.service';
import { isWorkingDay } from '../leaves/working-days.util';
import { CreatePayrollDto, UpdatePayrollDto, QueryPayrollDto } from './dto';
import { PayrollStatus } from '@prisma/client';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private hrSettings: HrSettingsService,
  ) {}

  /**
   * Предложение за ведомост от вече въведените данни — същата логика като
   * попъпа „За плащане" в HR › Присъствие: отработени дни (дни със запис,
   * без значение на колко обекта) × дневна ставка (лична ?? позиция × часове
   * в работен ден). Без ставка → основната от активния трудов договор.
   * Нищо не се записва; формата го показва като предложение за редакция.
   */
  async suggest(companyId: string, userId: string, year: number, month: number) {
    if (!year || !month || month < 1 || month > 12) {
      throw new BadRequestException('Невалиден период');
    }
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));

    const [member, attendances, leaves, contract, existing, workDayHours] =
      await Promise.all([
        this.prisma.userCompany.findFirst({
          where: { userId, companyId },
          select: { hourlyRate: true, position: { select: { hourlyRate: true } } },
        }),
        this.prisma.attendance.findMany({
          where: { companyId, userId, date: { gte: from, lte: to } },
          select: { date: true },
        }),
        this.prisma.leave.findMany({
          where: {
            companyId,
            userId,
            status: 'APPROVED',
            startDate: { lte: to },
            endDate: { gte: from },
          },
          select: { type: true, startDate: true, endDate: true, halfDay: true },
        }),
        // Действащ (или изменен с анекс) договор — последният анекс със заплата печели
        this.prisma.employmentContract.findFirst({
          where: { companyId, userId, status: { in: ['ACTIVE', 'AMENDED'] } },
          orderBy: { startDate: 'desc' },
          select: {
            salary: true,
            annexes: {
              where: { newSalary: { not: null }, effectiveDate: { lte: to } },
              orderBy: { effectiveDate: 'desc' },
              take: 1,
              select: { newSalary: true },
            },
          },
        }),
        this.prisma.payroll.findFirst({
          where: { companyId, userId, year, month, status: { not: 'CANCELLED' } },
          select: { id: true, status: true },
        }),
        this.hrSettings.getWorkDayHours(companyId),
      ]);

    if (!member) {
      throw new BadRequestException('User is not an employee of this company');
    }

    let workingDays = 0;
    const days: Date[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) {
      days.push(d);
      if (isWorkingDay(d)) workingDays++;
    }

    const workedDays = new Set(
      attendances.map((a) => a.date.toISOString().slice(0, 10)),
    ).size;

    // Отсъствия само в работни дни на месеца (отпуските могат да минават границата)
    const leaveDays = { vacation: 0, sick: 0, unpaid: 0, other: 0 };
    for (const d of days) {
      if (!isWorkingDay(d)) continue;
      const l = leaves.find((x) => x.startDate <= d && x.endDate >= d);
      if (!l) continue;
      const w = l.halfDay ? 0.5 : 1;
      if (l.type === 'ANNUAL') leaveDays.vacation += w;
      else if (l.type === 'SICK') leaveDays.sick += w;
      else if (l.type === 'UNPAID') leaveDays.unpaid += w;
      else leaveDays.other += w;
    }

    const hourlyRate = member.hourlyRate ?? member.position?.hourlyRate ?? null;
    const dailyRate = hourlyRate != null ? round2(Number(hourlyRate) * workDayHours) : null;
    const contractAmount = contract?.annexes[0]?.newSalary ?? contract?.salary ?? null;
    const contractSalary = contractAmount != null ? Number(contractAmount) : null;

    let baseSalary: number | null = null;
    let source: 'attendance' | 'contract' | null = null;
    if (dailyRate != null) {
      baseSalary = round2(workedDays * dailyRate);
      source = 'attendance';
    } else if (contractSalary != null) {
      baseSalary = contractSalary;
      source = 'contract';
    }

    return {
      workingDays,
      workedDays,
      leaveDays,
      workDayHours,
      hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
      dailyRate,
      contractSalary,
      baseSalary,
      source,
      existing,
    };
  }

  private calculateSalaries(data: {
    baseSalary: number;
    overtimePay?: number;
    bonuses?: number;
    allowances?: number;
    commissions?: number;
    taxDeductions?: number;
    insuranceEmployee?: number;
    otherDeductions?: number;
  }) {
    const grossSalary =
      data.baseSalary +
      (data.overtimePay || 0) +
      (data.bonuses || 0) +
      (data.allowances || 0) +
      (data.commissions || 0);

    const totalDeductions =
      (data.taxDeductions || 0) +
      (data.insuranceEmployee || 0) +
      (data.otherDeductions || 0);

    const netSalary = grossSalary - totalDeductions;

    return { grossSalary, netSalary };
  }

  async create(companyId: string, dto: CreatePayrollDto) {
    // Verify user is employee of company
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId: dto.userId, companyId },
    });

    if (!userCompany) {
      throw new BadRequestException('User is not an employee of this company');
    }

    // Check if payroll already exists for this user and period
    const existing = await this.prisma.payroll.findUnique({
      where: {
        companyId_userId_year_month: {
          companyId,
          userId: dto.userId,
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Payroll record already exists for this period',
      );
    }

    const { grossSalary, netSalary } = this.calculateSalaries(dto);

    const payroll = await this.prisma.payroll.create({
      data: {
        userId: dto.userId,
        year: dto.year,
        month: dto.month,
        baseSalary: dto.baseSalary,
        grossSalary,
        netSalary,
        overtimePay: dto.overtimePay || 0,
        bonuses: dto.bonuses || 0,
        allowances: dto.allowances || 0,
        commissions: dto.commissions || 0,
        taxDeductions: dto.taxDeductions || 0,
        insuranceEmployee: dto.insuranceEmployee || 0,
        insuranceEmployer: dto.insuranceEmployer || 0,
        otherDeductions: dto.otherDeductions || 0,
        workingDays: dto.workingDays || 0,
        workedDays: dto.workedDays || 0,
        sickLeaveDays: dto.sickLeaveDays || 0,
        vacationDays: dto.vacationDays || 0,
        unpaidLeaveDays: dto.unpaidLeaveDays || 0,
        notes: dto.notes,
        companyId,
        items: dto.items
          ? {
              create: dto.items.map((item) => ({
                type: item.type,
                description: item.description,
                amount: item.amount,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return { ...payroll, user };
  }

  async findAll(companyId: string, query: QueryPayrollDto) {
    const {
      userId,
      year,
      month,
      status,
      page = 1,
      limit = 50,
      sortBy = 'year',
      sortOrder = 'desc',
    } = query;

    const where: any = { companyId };

    if (userId) {
      where.userId = userId;
    }

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    if (status) {
      where.status = status;
    }

    const [total, payrolls] = await Promise.all([
      this.prisma.payroll.count({ where }),
      this.prisma.payroll.findMany({
        where,
        include: {
          items: true,
        },
        orderBy:
          sortBy === 'year'
            ? [{ year: sortOrder }, { month: sortOrder }]
            : { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Enrich with user data
    const userIds = [...new Set(payrolls.map((p) => p.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const enrichedPayrolls = payrolls.map((p) => ({
      ...p,
      user: usersMap.get(p.userId) || null,
    }));

    return {
      data: enrichedPayrolls,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
      include: {
        items: true,
      },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: payroll.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Get approver info
    let approvedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    } | null = null;
    if (payroll.approvedById) {
      approvedBy = await this.prisma.user.findUnique({
        where: { id: payroll.approvedById },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    }

    return { ...payroll, user, approvedBy };
  }

  async update(companyId: string, id: string, dto: UpdatePayrollDto) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    // Can only update DRAFT payrolls
    if (payroll.status !== PayrollStatus.DRAFT && dto.status === undefined) {
      throw new BadRequestException('Can only edit payrolls in DRAFT status');
    }

    // Recalculate salaries if any salary field is updated
    let grossSalary = payroll.grossSalary;
    let netSalary = payroll.netSalary;

    if (
      dto.baseSalary !== undefined ||
      dto.overtimePay !== undefined ||
      dto.bonuses !== undefined ||
      dto.allowances !== undefined ||
      dto.commissions !== undefined ||
      dto.taxDeductions !== undefined ||
      dto.insuranceEmployee !== undefined ||
      dto.otherDeductions !== undefined
    ) {
      const calculated = this.calculateSalaries({
        baseSalary: dto.baseSalary ?? Number(payroll.baseSalary),
        overtimePay: dto.overtimePay ?? Number(payroll.overtimePay),
        bonuses: dto.bonuses ?? Number(payroll.bonuses),
        allowances: dto.allowances ?? Number(payroll.allowances),
        commissions: dto.commissions ?? Number(payroll.commissions),
        taxDeductions: dto.taxDeductions ?? Number(payroll.taxDeductions),
        insuranceEmployee:
          dto.insuranceEmployee ?? Number(payroll.insuranceEmployee),
        otherDeductions: dto.otherDeductions ?? Number(payroll.otherDeductions),
      });
      grossSalary = calculated.grossSalary as any;
      netSalary = calculated.netSalary as any;
    }

    // Update items if provided
    if (dto.items) {
      // Delete existing items
      await this.prisma.payrollItem.deleteMany({
        where: { payrollId: id },
      });

      // Create new items
      await this.prisma.payrollItem.createMany({
        data: dto.items.map((item) => ({
          payrollId: id,
          type: item.type,
          description: item.description,
          amount: item.amount,
        })),
      });
    }

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: {
        baseSalary: dto.baseSalary,
        grossSalary,
        netSalary,
        overtimePay: dto.overtimePay,
        bonuses: dto.bonuses,
        allowances: dto.allowances,
        commissions: dto.commissions,
        taxDeductions: dto.taxDeductions,
        insuranceEmployee: dto.insuranceEmployee,
        insuranceEmployer: dto.insuranceEmployer,
        otherDeductions: dto.otherDeductions,
        workingDays: dto.workingDays,
        workedDays: dto.workedDays,
        sickLeaveDays: dto.sickLeaveDays,
        vacationDays: dto.vacationDays,
        unpaidLeaveDays: dto.unpaidLeaveDays,
        status: dto.status,
        notes: dto.notes,
      },
      include: {
        items: true,
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
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (
      payroll.status !== PayrollStatus.DRAFT &&
      payroll.status !== PayrollStatus.PENDING
    ) {
      throw new BadRequestException(
        'Can only approve DRAFT or PENDING payrolls',
      );
    }

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  async markAsPaid(companyId: string, id: string, paymentReference?: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Can only mark APPROVED payrolls as paid');
    }

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.PAID,
        paidAt: new Date(),
        paymentReference,
      },
    });

    return updated;
  }

  async cancel(companyId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payroll.status === PayrollStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid payroll');
    }

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.CANCELLED,
      },
    });

    return updated;
  }

  async remove(companyId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Can only delete DRAFT payrolls');
    }

    await this.prisma.payroll.delete({
      where: { id },
    });

    return { success: true, message: 'Payroll record deleted' };
  }

  // Get summary for a period
  async getSummary(companyId: string, year: number, month?: number) {
    const where: any = { companyId, year };
    if (month) {
      where.month = month;
    }

    const payrolls = await this.prisma.payroll.findMany({
      where,
    });

    const summary = {
      totalRecords: payrolls.length,
      totalGrossSalary: 0,
      totalNetSalary: 0,
      totalTaxDeductions: 0,
      totalInsuranceEmployee: 0,
      totalInsuranceEmployer: 0,
      totalBonuses: 0,
      statusCounts: {
        DRAFT: 0,
        PENDING: 0,
        APPROVED: 0,
        PAID: 0,
        CANCELLED: 0,
      },
    };

    for (const p of payrolls) {
      summary.totalGrossSalary += Number(p.grossSalary);
      summary.totalNetSalary += Number(p.netSalary);
      summary.totalTaxDeductions += Number(p.taxDeductions);
      summary.totalInsuranceEmployee += Number(p.insuranceEmployee);
      summary.totalInsuranceEmployer += Number(p.insuranceEmployer);
      summary.totalBonuses += Number(p.bonuses);
      summary.statusCounts[p.status]++;
    }

    return summary;
  }

  // Generate payroll for all employees for a given month
  async generateBulk(
    companyId: string,
    year: number,
    month: number,
    defaultBaseSalary: number,
  ) {
    // Get all employees of the company
    const userCompanies = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const created: any[] = [];
    const skipped: any[] = [];

    for (const uc of userCompanies) {
      // Check if payroll already exists
      const existing = await this.prisma.payroll.findUnique({
        where: {
          companyId_userId_year_month: {
            companyId,
            userId: uc.userId,
            year,
            month,
          },
        },
      });

      if (existing) {
        skipped.push({
          userId: uc.userId,
          userName: `${uc.user.firstName} ${uc.user.lastName}`,
          reason: 'Already exists',
        });
        continue;
      }

      const { grossSalary, netSalary } = this.calculateSalaries({
        baseSalary: defaultBaseSalary,
      });

      const payroll = await this.prisma.payroll.create({
        data: {
          userId: uc.userId,
          year,
          month,
          baseSalary: defaultBaseSalary,
          grossSalary,
          netSalary,
          companyId,
        },
      });

      created.push({
        id: payroll.id,
        userId: uc.userId,
        userName: `${uc.user.firstName} ${uc.user.lastName}`,
      });
    }

    return { created, skipped };
  }
}
