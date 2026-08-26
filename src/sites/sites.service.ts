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

    return {
      site,
      orders,
      expenses,
      monthly,
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
