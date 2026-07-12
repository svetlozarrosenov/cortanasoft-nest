import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface PartnersReportQuery {
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Оборот по партньори. Чете snapshot-а Order.partnerCustomerId, НЕ живата
  // връзка Customer.referredById — така прехвърлянето на клиенти към друг
  // партньор не пренаписва историята, а бивши партньори (вече без договор)
  // остават в отчета с натрупания си оборот.
  async partnersReport(companyId: string, query: PartnersReportQuery) {
    const orderWhere: Prisma.OrderWhereInput = {
      companyId,
      partnerCustomerId: { not: null },
      // Анулираните поръчки не са реален оборот
      status: { not: 'CANCELLED' },
      ...((query.from || query.to) && {
        orderDate: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to + 'T23:59:59.999Z') }),
        },
      }),
    };

    const grouped = await this.prisma.order.groupBy({
      by: ['partnerCustomerId'],
      where: orderWhere,
      _count: { _all: true },
      _sum: { total: true },
    });

    const turnoverByPartner = new Map(
      grouped.map((g) => [
        g.partnerCustomerId as string,
        {
          ordersCount: g._count._all,
          turnover: g._sum.total?.toNumber() ?? 0,
        },
      ]),
    );

    // Всички настоящи партньори + всички с исторически оборот (може вече да
    // не са партньори — демаркирани след прекратен договор)
    const partnerIds = [...turnoverByPartner.keys()];
    const partners = await this.prisma.customer.findMany({
      where: {
        companyId,
        OR: [{ isPartner: true }, { id: { in: partnerIds } }],
      },
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        city: true,
        isPartner: true,
        isActive: true,
        _count: { select: { referrals: true } },
      },
    });

    const rows = partners.map((p) => ({
      partner: {
        id: p.id,
        type: p.type,
        companyName: p.companyName,
        firstName: p.firstName,
        lastName: p.lastName,
        city: p.city,
        isPartner: p.isPartner,
        isActive: p.isActive,
      },
      referralsCount: p._count.referrals,
      ordersCount: turnoverByPartner.get(p.id)?.ordersCount ?? 0,
      turnover: turnoverByPartner.get(p.id)?.turnover ?? 0,
    }));

    rows.sort((a, b) => b.turnover - a.turnover);

    return {
      rows,
      totals: {
        partners: rows.length,
        ordersCount: rows.reduce((s, r) => s + r.ordersCount, 0),
        turnover: rows.reduce((s, r) => s + r.turnover, 0),
      },
    };
  }
}
