import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  QuerySitesDto,
  QuerySiteSummaryDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

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
          location: { select: { id: true, name: true, type: true } },
          // Snapshot на екипа, изпълнил поръчката (пълни се при SHIPPED/DELIVERED)
          crewMembers: {
            select: { userId: true, firstName: true, lastName: true },
          },
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
          location: { select: { id: true, name: true, type: true } },
          crewMembers: {
            select: { userId: true, firstName: true, lastName: true },
          },
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
    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
    const bump = (key: string, field: 'revenue' | 'expenses', amount: number) => {
      const entry = monthlyMap.get(key) || { revenue: 0, expenses: 0 };
      entry[field] += amount;
      monthlyMap.set(key, entry);
    };
    for (const o of revenueOrders) {
      bump(monthKey(new Date(o.orderDate)), 'revenue', Number(o.total));
    }
    for (const e of activeExpenses) {
      bump(monthKey(new Date(e.expenseDate)), 'expenses', Number(e.totalAmount));
    }
    const monthly = [...monthlyMap.entries()]
      .map(([month, values]) => ({ month, ...values }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // „Работили на обекта": екипите от поръчките И разходите, групирани по
    // бус (или „без бус" за документи само с изричен екип). Хората идват от
    // изричния избор/snapshot-ите; за стари поръчки без snapshot падаме към
    // ТЕКУЩИЯ екип на буса (isCurrent: true — UI-ят го маркира като такъв).
    type WorkforceMember = {
      userId: string | null;
      firstName: string;
      lastName: string;
      isCurrent: boolean;
    };
    const NO_VEHICLE = '__none__';
    const workforceMap = new Map<
      string,
      {
        vehicle: { id: string; name: string } | null;
        members: Map<string, WorkforceMember>;
      }
    >();
    const addCrew = (
      vehicle: { id: string; name: string } | null,
      crew: { userId: string | null; firstName: string; lastName: string }[],
    ) => {
      const mapKey = vehicle ? vehicle.id : NO_VEHICLE;
      let entry = workforceMap.get(mapKey);
      if (!entry) {
        entry = { vehicle, members: new Map() };
        workforceMap.set(mapKey, entry);
      }
      for (const member of crew) {
        const key = member.userId || `${member.firstName} ${member.lastName}`;
        if (!entry.members.has(key)) {
          entry.members.set(key, { ...member, isCurrent: false });
        }
      }
    };
    const vehiclesWithoutSnapshot = new Set<string>();
    for (const o of revenueOrders) {
      const vehicle =
        o.location && o.location.type === 'VEHICLE'
          ? { id: o.location.id, name: o.location.name }
          : null;
      if (!vehicle && o.crewMembers.length === 0) continue;
      addCrew(vehicle, o.crewMembers);
      if (vehicle && o.crewMembers.length === 0) {
        vehiclesWithoutSnapshot.add(vehicle.id);
      }
    }
    // Разходите носят само изричен екип — без fallback към текущ състав
    for (const e of activeExpenses) {
      const vehicle =
        e.location && e.location.type === 'VEHICLE'
          ? { id: e.location.id, name: e.location.name }
          : null;
      if (!vehicle && e.crewMembers.length === 0) continue;
      addCrew(vehicle, e.crewMembers);
    }
    if (vehiclesWithoutSnapshot.size > 0) {
      const currentMembers = await this.prisma.locationMember.findMany({
        where: { locationId: { in: [...vehiclesWithoutSnapshot] } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      for (const member of currentMembers) {
        const entry = workforceMap.get(member.locationId);
        if (entry && !entry.members.has(member.user.id)) {
          entry.members.set(member.user.id, {
            userId: member.user.id,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            isCurrent: true,
          });
        }
      }
    }
    const workforce = [...workforceMap.values()].map((entry) => ({
      vehicle: entry.vehicle,
      members: [...entry.members.values()],
    }));

    // Присъствия на обекта за периода (HR > Присъствия е източникът) —
    // групирани по служител: колко дни е бил тук
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        companyId,
        siteId: id,
        ...(dateFrom || dateTo
          ? { date: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
          : {}),
      },
      select: { userId: true, date: true },
      orderBy: { date: 'asc' },
    });
    const attendanceByUser = new Map<string, Set<string>>();
    for (const rec of attendanceRecords) {
      const days = attendanceByUser.get(rec.userId) || new Set<string>();
      days.add(rec.date.toISOString().slice(0, 10));
      attendanceByUser.set(rec.userId, days);
    }
    const attendanceUsers = await this.prisma.user.findMany({
      where: { id: { in: [...attendanceByUser.keys()] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const attendance = attendanceUsers
      .map((u) => ({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        days: attendanceByUser.get(u.id)?.size || 0,
        dates: [...(attendanceByUser.get(u.id) || [])].sort(),
      }))
      .sort((a, b) => b.days - a.days);

    return {
      site,
      orders,
      expenses,
      monthly,
      workforce,
      attendance,
      totals: {
        revenue,
        paid,
        expenses: expensesTotal,
        result: revenue - expensesTotal,
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
