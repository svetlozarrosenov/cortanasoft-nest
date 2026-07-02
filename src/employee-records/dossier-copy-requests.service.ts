import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DossierCopyRequestKind,
  DossierCopyRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { checkPermission } from '../common/guards/permissions.guard';
import { RolePermissions } from '../common/config/permissions.config';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

const DUE_DAYS = 14; // чл. 5 от наредбата — 14-дневен срок

/**
 * Заявки на служителя за документи/преписи от досието му (чл. 5 от наредбата
 * + чл. 128б, ал. 4 КТ). Работодателят дължи изпълнение в 14-дневен срок —
 * dueAt се смята автоматично, а HR вижда наближаващите срокове.
 */
@Injectable()
export class DossierCopyRequestsService {
  private readonly logger = new Logger(DossierCopyRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
    private audit: EmployeeRecordAuditService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: { kind: DossierCopyRequestKind; scope?: string },
  ) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + DUE_DAYS);

    const request = await this.prisma.dossierCopyRequest.create({
      data: {
        companyId,
        userId,
        kind: dto.kind,
        scope: dto.scope ?? null,
        dueAt,
      },
    });

    this.notifyHr(companyId, userId, {
      title: 'Заявка за препис от трудово досие',
      body:
        dto.kind === 'PAPER'
          ? 'Заявени са хартиени преписи (срок 14 дни)'
          : 'Заявени са електронни документи (срок 14 дни)',
    }).catch((err) => this.logger.error('Failed to notify HR', err));

    await this.audit.log(companyId, {
      action: 'COPY_REQUEST',
      actorId: userId,
      targetUserId: userId,
      entityType: 'dossierCopyRequest',
      entityId: request.id,
      detail: dto.kind,
    });

    return request;
  }

  async findAll(
    companyId: string,
    query: { status?: DossierCopyRequestStatus; page?: number; limit?: number },
  ) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 50, 200);
    const where: Prisma.DossierCopyRequestWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.dossierCopyRequest.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dossierCopyRequest.count({ where }),
    ]);

    const userIds = [...new Set(data.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));

    return {
      data: data.map((r) => ({ ...r, user: map.get(r.userId) ?? null })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMine(companyId: string, userId: string) {
    const data = await this.prisma.dossierCopyRequest.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  /** HR: изпълнена / отказана. Служителят получава известие. */
  async resolve(
    companyId: string,
    id: string,
    actor: { id: string; email?: string },
    dto: { status: 'FULFILLED' | 'REJECTED'; responseNote?: string },
  ) {
    const request = await this.prisma.dossierCopyRequest.findFirst({
      where: { id, companyId },
    });
    if (!request) throw new NotFoundException('Заявката не е намерена');

    const updated = await this.prisma.dossierCopyRequest.update({
      where: { id },
      data: {
        status: dto.status,
        responseNote: dto.responseNote ?? null,
        fulfilledById: actor.id,
        fulfilledAt: new Date(),
      },
    });

    this.push
      .sendToUser(request.userId, {
        title:
          dto.status === 'FULFILLED'
            ? 'Заявката ви за преписи е изпълнена'
            : 'Заявката ви за преписи е отказана',
        body: dto.responseNote || '',
        url: `/dashboard/${companyId}/employee-records/my`,
        tag: `copy-request-${id}`,
      })
      .catch((err) => this.logger.error('Failed to push copy resolve', err));

    await this.audit.log(companyId, {
      action: 'COPY_FULFILLED',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: request.userId,
      entityType: 'dossierCopyRequest',
      entityId: id,
      detail: dto.status,
    });

    return updated;
  }

  private async notifyHr(
    companyId: string,
    excludeUserId: string,
    payload: { title: string; body: string },
  ) {
    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: { role: true },
    });
    const hrIds = members
      .filter((m) => {
        if (m.userId === excludeUserId) return false;
        const perms = m.role?.permissions as unknown as RolePermissions;
        return checkPermission(perms, 'employeeRecords', 'submissions', 'view');
      })
      .map((m) => m.userId);
    if (!hrIds.length) return;
    await this.push.sendToUsers(hrIds, {
      ...payload,
      url: `/dashboard/${companyId}/employee-records/submissions`,
      tag: `copy-requests-${companyId}`,
    });
  }
}
