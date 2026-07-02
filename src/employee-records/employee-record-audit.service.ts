import { Injectable, Logger } from '@nestjs/common';
import { EmployeeRecordAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: EmployeeRecordAuditAction;
  actorId?: string | null;
  actorEmail?: string | null;
  targetUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  detail?: string | null;
}

export interface AuditQuery {
  targetUserId?: string;
  actorId?: string;
  action?: EmployeeRecordAuditAction;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * Одит журнал на трудовите досиета (чл. 12 от наредбата): всяко движение и
 * операция се записва с лице, е-адрес и момент. Журналът е APPEND-ONLY —
 * няма update/delete API и поредността на постъпване не се променя
 * (чл. 12, ал. 2). Времето е сървърно с точност до секунда; квалифициран
 * времеви печат (чл. 12, ал. 3) ще се добавя от Евротръст интеграцията.
 */
@Injectable()
export class EmployeeRecordAuditService {
  private readonly logger = new Logger(EmployeeRecordAuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Best-effort запис — одитът не бива да чупи основната операция. */
  async log(companyId: string, entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.employeeRecordAuditEvent.create({
        data: {
          companyId,
          action: entry.action,
          actorId: entry.actorId ?? null,
          actorEmail: entry.actorEmail ?? null,
          targetUserId: entry.targetUserId ?? null,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          detail: entry.detail ?? null,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit event', err as Error);
    }
  }

  async findAll(companyId: string, query: AuditQuery) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 50, 200);

    const where: Prisma.EmployeeRecordAuditEventWhereInput = {
      companyId,
      ...(query.targetUserId ? { targetUserId: query.targetUserId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.employeeRecordAuditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employeeRecordAuditEvent.count({ where }),
    ]);

    // Обогатяване с имена на лицата (userId е плосък скалар по конвенция)
    const userIds = [
      ...new Set(
        data.flatMap((e) => [e.actorId, e.targetUserId]).filter(Boolean),
      ),
    ] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      data: data.map((e) => ({
        ...e,
        actor: e.actorId ? userMap.get(e.actorId) ?? null : null,
        targetUser: e.targetUserId ? userMap.get(e.targetUserId) ?? null : null,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
