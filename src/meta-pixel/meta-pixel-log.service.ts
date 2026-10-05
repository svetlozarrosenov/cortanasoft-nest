import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MetaPixelLogQuery {
  eventName?: string;
  status?: 'success' | 'error';
  search?: string; // имейл или път
  from?: string; // YYYY-MM-DD
  to?: string;
  visitor?: string; // пътеката на един посетител (cs_vid или _fbp)
  limit?: number;
  cursor?: string;
}

const RETENTION_DAYS = 180;

/**
 * Четене на лога на Meta Pixel събитията за администрацията: списък с
 * филтри и cursor-пагинация, обобщение (по тип, успех/грешка, топ страници,
 * уникални посетители по _fbp) и пътеката на един посетител.
 */
@Injectable()
export class MetaPixelLogService {
  private readonly logger = new Logger(MetaPixelLogService.name);

  constructor(private prisma: PrismaService) {}

  private where(q: MetaPixelLogQuery): Prisma.MetaPixelEventWhereInput {
    const where: Prisma.MetaPixelEventWhereInput = {};
    if (q.eventName) where.eventName = q.eventName;
    if (q.status === 'success') where.capiSuccess = true;
    if (q.status === 'error') where.capiSuccess = false;
    if (q.visitor) where.OR = [{ visitorId: q.visitor }, { fbp: q.visitor }];
    if (q.search) {
      const s = q.search.trim();
      where.AND = [
        {
          OR: [
            { userEmail: { contains: s, mode: 'insensitive' } },
            { path: { contains: s, mode: 'insensitive' } },
            { userLastName: { contains: s, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (q.from || q.to) {
      where.eventTime = {
        ...(q.from && { gte: new Date(q.from + 'T00:00:00.000Z') }),
        ...(q.to && { lte: new Date(q.to + 'T23:59:59.999Z') }),
      };
    }
    return where;
  }

  async list(q: MetaPixelLogQuery) {
    const limit = Math.min(Math.max(q.limit ?? 100, 1), 500);
    const where = this.where(q);
    const rows = await this.prisma.metaPixelEvent.findMany({
      where,
      orderBy: { eventTime: 'desc' },
      take: limit + 1,
      ...(q.cursor && { cursor: { id: q.cursor }, skip: 1 }),
    });
    const hasMore = rows.length > limit;
    const events = hasMore ? rows.slice(0, limit) : rows;
    // Посетител, който е пратил форма (имейл) по-късно/по-рано — показваме
    // кой е и на анонимните му PageView-ове
    const keyOf = (e: { visitorId: string | null; fbp: string | null }) =>
      e.visitorId ?? e.fbp;
    const identity = await this.identities(
      events.map(keyOf).filter((f): f is string => !!f),
    );
    return {
      events: events.map((e) => ({
        ...e,
        visitorKey: keyOf(e),
        visitorEmail:
          e.userEmail ??
          (keyOf(e) ? (identity.get(keyOf(e) as string) ?? null) : null),
      })),
      nextCursor: hasMore ? events[events.length - 1].id : null,
    };
  }

  private async identities(fbps: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(fbps)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.metaPixelEvent.findMany({
      where: {
        OR: [{ visitorId: { in: unique } }, { fbp: { in: unique } }],
        userEmail: { not: null },
      },
      orderBy: { eventTime: 'desc' },
      select: { visitorId: true, fbp: true, userEmail: true },
    });
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const k of [r.visitorId, r.fbp])
        if (k && !map.has(k)) map.set(k, r.userEmail as string);
    }
    return map;
  }

  /** Обобщение за същия филтър; без период = последните 30 дни */
  async summary(q: MetaPixelLogQuery) {
    const base = this.where({ ...q, cursor: undefined });
    if (!q.from && !q.to) {
      base.eventTime = { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) };
    }
    const [total, success, byEvent, topPages, visitors, leads] =
      await Promise.all([
        this.prisma.metaPixelEvent.count({ where: base }),
        this.prisma.metaPixelEvent.count({
          where: { ...base, capiSuccess: true },
        }),
        this.prisma.metaPixelEvent.groupBy({
          by: ['eventName'],
          where: base,
          _count: { _all: true },
        }),
        this.prisma.metaPixelEvent.groupBy({
          by: ['path'],
          where: { ...base, eventName: 'PageView', path: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { path: 'desc' } },
          take: 10,
        }),
        this.prisma.metaPixelEvent.findMany({
          where: {
            ...base,
            OR: [{ visitorId: { not: null } }, { fbp: { not: null } }],
          },
          select: { visitorId: true, fbp: true },
        }),
        this.prisma.metaPixelEvent.count({
          where: { ...base, eventName: { in: ['Lead', 'Contact'] } },
        }),
      ]);
    return {
      total,
      successCount: success,
      errorCount: total - success,
      successRate: total > 0 ? success / total : 0,
      byEvent: Object.fromEntries(
        byEvent.map((b) => [b.eventName, b._count._all]),
      ),
      topPages: topPages.map((p) => ({ path: p.path, count: p._count._all })),
      uniqueVisitors: new Set(visitors.map((v) => v.visitorId ?? v.fbp)).size,
      leads,
    };
  }

  /** Всички събития на един браузър (по _fbp), хронологично */
  async visitor(key: string) {
    const events = await this.prisma.metaPixelEvent.findMany({
      where: { OR: [{ visitorId: key }, { fbp: key }] },
      orderBy: [{ eventTime: 'asc' }, { id: 'asc' }],
      take: 500,
    });
    const identified = [...events].reverse().find((e) => e.userEmail);
    const uniq = (xs: (string | null)[]) => [
      ...new Set(xs.filter((x): x is string => !!x)),
    ];
    const sessions = this.sessionsOf(events);
    return {
      visitor: key,
      email: identified?.userEmail ?? null,
      phone: [...events].reverse().find((e) => e.userPhone)?.userPhone ?? null,
      name: identified
        ? [identified.userFirstName, identified.userLastName]
            .filter(Boolean)
            .join(' ') || null
        : null,
      firstSeen: events[0]?.eventTime ?? null,
      lastSeen: events[events.length - 1]?.eventTime ?? null,
      firstReferrer: events.find((e) => e.referrer)?.referrer ?? null,
      ips: uniq(events.map((e) => e.userIp)),
      devices: uniq(events.map((e) => e.userAgent)),
      fbp: uniq(events.map((e) => e.fbp)),
      pageViews: events.filter((e) => e.eventName === 'PageView').length,
      sessions: sessions.length,
      byEvent: events.reduce<Record<string, number>>(
        (acc, e) => ((acc[e.eventName] = (acc[e.eventName] ?? 0) + 1), acc),
        {},
      ),
      topPages: Object.entries(
        events
          .filter((e) => e.eventName === 'PageView' && e.path)
          .reduce<
            Record<string, number>
          >((acc, e) => ((acc[e.path as string] = (acc[e.path as string] ?? 0) + 1), acc), {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
      events,
    };
  }

  /** Сесии = поредици събития с пауза под 30 минути */
  private sessionsOf(events: { eventTime: Date }[]) {
    const sessions: { start: Date; end: Date }[] = [];
    for (const e of events) {
      const last = sessions[sessions.length - 1];
      if (last && e.eventTime.getTime() - last.end.getTime() < 30 * 60 * 1000)
        last.end = e.eventTime;
      else sessions.push({ start: e.eventTime, end: e.eventTime });
    }
    return sessions;
  }

  /** Списък посетители за picker-а: по имейл/име/идентификатор, последни активни първи */
  async visitors(search?: string, limit = 30) {
    const s = search?.trim();
    const where: Prisma.MetaPixelEventWhereInput = {
      OR: [{ visitorId: { not: null } }, { fbp: { not: null } }],
      ...(s && {
        AND: [
          {
            OR: [
              { userEmail: { contains: s, mode: 'insensitive' } },
              { userLastName: { contains: s, mode: 'insensitive' } },
              { userFirstName: { contains: s, mode: 'insensitive' } },
              { visitorId: { contains: s } },
              { fbp: { contains: s } },
              { userIp: { contains: s } },
            ],
          },
        ],
      }),
    };
    // Групираме в код: ключът е visitorId ?? fbp, което groupBy не може
    const rows = await this.prisma.metaPixelEvent.findMany({
      where,
      orderBy: { eventTime: 'desc' },
      take: 2000,
      select: {
        visitorId: true,
        fbp: true,
        userEmail: true,
        userFirstName: true,
        userLastName: true,
        eventTime: true,
        eventName: true,
        userAgent: true,
      },
    });
    const map = new Map<
      string,
      {
        key: string;
        email: string | null;
        name: string | null;
        lastSeen: Date;
        firstSeen: Date;
        events: number;
        leads: number;
        device: string | null;
      }
    >();
    for (const r of rows) {
      const key = r.visitorId ?? (r.fbp as string);
      const v = map.get(key) ?? {
        key,
        email: null,
        name: null,
        lastSeen: r.eventTime,
        firstSeen: r.eventTime,
        events: 0,
        leads: 0,
        device: r.userAgent,
      };
      v.events += 1;
      if (r.eventName === 'Lead' || r.eventName === 'Contact') v.leads += 1;
      if (!v.email && r.userEmail) {
        v.email = r.userEmail;
        v.name =
          [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || null;
      }
      if (r.eventTime < v.firstSeen) v.firstSeen = r.eventTime;
      map.set(key, v);
    }
    return [...map.values()].slice(0, limit);
  }

  /** PageView-овете се трупат — пазим 180 дни */
  @Cron('30 3 * * *', { timeZone: 'Europe/Sofia' })
  async cleanup() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
    const { count } = await this.prisma.metaPixelEvent.deleteMany({
      where: { eventTime: { lt: cutoff } },
    });
    if (count > 0)
      this.logger.log(
        `Meta Pixel log cleanup: ${count} rows older than ${RETENTION_DAYS} days`,
      );
  }
}
