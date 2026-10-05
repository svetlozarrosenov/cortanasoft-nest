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
    const identified = events.find((e) => e.userEmail);
    return {
      visitor: key,
      email: identified?.userEmail ?? null,
      name: identified
        ? [identified.userFirstName, identified.userLastName]
            .filter(Boolean)
            .join(' ') || null
        : null,
      firstSeen: events[0]?.eventTime ?? null,
      lastSeen: events[events.length - 1]?.eventTime ?? null,
      events,
    };
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
