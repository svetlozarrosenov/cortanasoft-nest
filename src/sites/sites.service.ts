import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrSettingsService } from '../hr-settings/hr-settings.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  QuerySitesDto,
  QuerySiteSummaryDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SitesService {
  constructor(
    private prisma: PrismaService,
    private hrSettings: HrSettingsService,
  ) {}

  async create(companyId: string, dto: CreateSiteDto) {
    return this.prisma.site.create({
      data: {
        ...dto,
        companyId,
      },
      include: {
        _count: { select: { orders: true, expenses: true } },
      },
    });
  }

  async findAll(companyId: string, query: QuerySitesDto) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.SiteWhereInput = {
      companyId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.site.findMany({
        where,
        include: {
          _count: { select: { orders: true, expenses: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.site.count({ where }),
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
    const site = await this.prisma.site.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { orders: true, expenses: true } },
      },
    });

    if (!site) {
      throw new NotFoundException('Обектът не е намерен');
    }

    return site;
  }

  // Детайл на обекта за избран период: продажби (приход), разходи и резултат.
  // В прихода влизат само потвърдени+ продажби; анулираните разходи не участват.
  async summary(companyId: string, id: string, query: QuerySiteSummaryDto) {
    const site = await this.findOne(companyId, id);

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : undefined;

    const [orders, expenses] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          companyId,
          siteId: id,
          ...(dateFrom || dateTo
            ? { orderDate: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
            : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          status: true,
          paymentStatus: true,
          customerId: true,
          customerName: true,
          total: true,
          paidAmount: true,
        },
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: {
          companyId,
          siteId: id,
          ...(dateFrom || dateTo
            ? { expenseDate: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
            : {}),
        },
        select: {
          id: true,
          description: true,
          category: true,
          totalAmount: true,
          expenseDate: true,
          status: true,
          invoiceNumber: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    // Приход по конвенцията на dashboard/erp-analytics: само реални продажби
    // (CONFIRMED+). DRAFT/PENDING остават видими в списъка, но не влизат в сумите.
    const REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const revenueOrders = orders.filter((o) =>
      REVENUE_STATUSES.includes(o.status),
    );
    const revenue = revenueOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const paid = revenueOrders.reduce(
      (sum, o) => sum + Number(o.paidAmount ?? 0),
      0,
    );
    const activeExpenses = expenses.filter((e) => e.status !== 'CANCELLED');
    const expensesTotal = activeExpenses.reduce(
      (sum, e) => sum + Number(e.totalAmount),
      0,
    );

    // Месечна разбивка за графиката (само редовете, които участват в сумите)
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthlyMap = new Map<string, { revenue: number; expenses: number; labor: number }>();
    const bump = (key: string, field: 'revenue' | 'expenses' | 'labor', amount: number) => {
      const entry = monthlyMap.get(key) || { revenue: 0, expenses: 0, labor: 0 };
      entry[field] += amount;
      monthlyMap.set(key, entry);
    };
    const bumpLabor = (key: string, amount: number) => bump(key, 'labor', amount);
    for (const o of revenueOrders) {
      bump(monthKey(new Date(o.orderDate)), 'revenue', Number(o.total));
    }
    for (const e of activeExpenses) {
      bump(monthKey(new Date(e.expenseDate)), 'expenses', Number(e.totalAmount));
    }

    // Присъствия на обекта за периода (HR > Присъствия е източникът) —
    // групирани по служител: колко дни е бил тук.
    // Труд по присъствия (HR > Присъствие е източникът). Ден, в който човекът е
    // бил и на друг обект, се дели — по часове, ако всички записи за деня са с
    // часове, иначе поравно (същата логика като попъпа в Присъствие).
    const dateFilter =
      dateFrom || dateTo
        ? { date: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
        : {};
    const siteRecords = await this.prisma.attendance.findMany({
      where: { companyId, siteId: id, ...dateFilter },
      select: { userId: true, date: true },
      orderBy: { date: 'asc' },
    });
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const userIds = [...new Set(siteRecords.map((r) => r.userId))];
    const dayKeys = [...new Set(siteRecords.map((r) => dayKey(r.date)))];

    const [allRecords, members, workDayHours] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          companyId,
          userId: { in: userIds },
          date: { in: dayKeys.map((k) => new Date(k)) },
        },
        select: { userId: true, date: true, siteId: true, workedMinutes: true },
      }),
      this.prisma.userCompany.findMany({
        where: { companyId, userId: { in: userIds } },
        select: {
          userId: true,
          hourlyRate: true,
          position: { select: { hourlyRate: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.hrSettings.getWorkDayHours(companyId),
    ]);

    // (user, ден) → записите за деня по всички обекти
    const byUserDay = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      const k = `${r.userId}|${dayKey(r.date)}`;
      byUserDay.set(k, [...(byUserDay.get(k) || []), r]);
    }
    const siteShare = (userId: string, day: string) => {
      const recs = byUserDay.get(`${userId}|${day}`) || [];
      const here = recs.filter((r) => r.siteId === id);
      if (recs.length === 0 || here.length === recs.length) return 1;
      const allTimed = recs.every((r) => (r.workedMinutes ?? 0) > 0);
      if (allTimed) {
        const total = recs.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0);
        return here.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0) / total;
      }
      return here.length / recs.length;
    };

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const attendance = userIds
      .map((userId) => {
        const mem = members.find((m) => m.userId === userId);
        const dates = [...new Set(siteRecords.filter((r) => r.userId === userId).map((r) => dayKey(r.date)))].sort();
        const days = round2(dates.reduce((sum, d) => sum + siteShare(userId, d), 0));
        const rate = mem?.hourlyRate ?? mem?.position?.hourlyRate ?? null;
        const dailyRate = rate != null ? round2(Number(rate) * workDayHours) : null;
        return {
          userId,
          firstName: mem?.user.firstName ?? '',
          lastName: mem?.user.lastName ?? '',
          days,
          dates,
          dailyRate,
          cost: dailyRate != null ? round2(days * dailyRate) : null,
        };
      })
      .sort((a, b) => b.days - a.days);
    const labor = round2(attendance.reduce((sum, a) => sum + (a.cost ?? 0), 0));
    const laborUnrated = attendance.filter((a) => a.cost == null && a.days > 0).length;

    // Трудът влиза и в месечната графика: разпределен по дните на присъствие
    for (const a of attendance) {
      if (a.dailyRate == null) continue;
      for (const d of a.dates) {
        bumpLabor(d.slice(0, 7), round2(siteShare(a.userId, d) * a.dailyRate));
      }
    }
    const monthly = [...monthlyMap.entries()]
      .map(([month, values]) => ({ month, ...values }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      site,
      orders,
      expenses,
      monthly,
      attendance,
      workDayHours,
      totals: {
        revenue,
        paid,
        expenses: expensesTotal,
        labor,
        laborUnrated,
        result: round2(revenue - expensesTotal - labor),
      },
    };
  }

  async update(companyId: string, id: string, dto: UpdateSiteDto) {
    await this.findOne(companyId, id);

    return this.prisma.site.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { orders: true, expenses: true } },
      },
    });
  }

  // Изтриването не трие продажби/разходи — връзките са SetNull, записите
  // просто остават без обект.
  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    await this.prisma.site.delete({ where: { id } });

    return { message: 'Обектът е изтрит успешно' };
  }
}
