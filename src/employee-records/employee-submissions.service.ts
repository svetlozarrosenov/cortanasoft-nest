import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeSubmissionCategory,
  EmployeeSubmissionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { MailService } from '../mail/mail.service';
import { checkPermission } from '../common/guards/permissions.guard';
import { RolePermissions } from '../common/config/permissions.config';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

const CATEGORY_LABELS: Record<EmployeeSubmissionCategory, string> = {
  APPLICATION: 'молба',
  REQUEST: 'заявление',
  DECLARATION: 'декларация',
  NOTICE: 'уведомление',
  REPORT: 'отчет',
  OTHER: 'документ',
};

const SUBMISSION_INCLUDE = {
  files: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.EmployeeSubmissionInclude;

/**
 * Входящи електронни документи от служителите (чл. 9 от наредбата):
 * регистрират се с пореден входящ номер, а системата автоматично изпраща
 * на служителя потвърждение с номера, датата и часа (чл. 9, ал. 2–3).
 */
@Injectable()
export class EmployeeSubmissionsService {
  private readonly logger = new Logger(EmployeeSubmissionsService.name);

  constructor(
    private prisma: PrismaService,
    private numbering: EmployeeRecordNumberingService,
    private push: PushNotificationsService,
    private mail: MailService,
    private audit: EmployeeRecordAuditService,
  ) {}

  /** Подаване от служител (Моето досие). */
  async create(
    companyId: string,
    userId: string,
    dto: {
      category?: EmployeeSubmissionCategory;
      subject: string;
      content?: string;
    },
  ) {
    const submission = await this.prisma.$transaction(async (tx) => {
      const regNumber = await this.numbering.next('submission', companyId, tx);
      return tx.employeeSubmission.create({
        data: {
          regNumber,
          category: dto.category ?? 'APPLICATION',
          subject: dto.subject,
          content: dto.content ?? null,
          userId,
          companyId,
        },
        include: SUBMISSION_INCLUDE,
      });
    });

    // Потвърждение до служителя с рег. номер, дата и час (чл. 9, ал. 2–3)
    const registeredAt = submission.createdAt;
    const stamp = registeredAt.toLocaleString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    let confirmationSentAt: Date | null = null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (user?.email) {
        await this.mail.send({
          to: user.email,
          subject: `Потвърждение за получаване — ${submission.regNumber}`,
          html: `<p>Здравейте${user.firstName ? `, ${user.firstName}` : ''},</p><p>Вашият документ „${submission.subject}" е регистриран с входящ номер <b>${submission.regNumber}</b> на ${stamp}.</p><p>(изпратено автоматично от CortanaSoft)</p>`,
        });
        confirmationSentAt = new Date();
        await this.prisma.employeeSubmission.update({
          where: { id: submission.id },
          data: { confirmationSentAt },
        });
      }
    } catch (err) {
      this.logger.error('Failed to send submission confirmation', err as Error);
    }

    // Извести HR екипа (роля с право employeeRecords.submissions view)
    this.notifyHr(companyId, userId, {
      title: 'Нов входящ документ от служител',
      body: `${submission.regNumber}: ${CATEGORY_LABELS[submission.category]} — ${submission.subject}`,
    }).catch((err) => this.logger.error('Failed to notify HR', err));

    await this.audit.log(companyId, {
      action: 'SUBMISSION',
      actorId: userId,
      targetUserId: userId,
      entityType: 'employeeSubmission',
      entityId: submission.id,
      detail: `${submission.regNumber} — ${submission.subject}`,
    });

    return { ...submission, confirmationSentAt };
  }

  async findAll(
    companyId: string,
    query: {
      status?: EmployeeSubmissionStatus;
      userId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 50, 200);
    const where: Prisma.EmployeeSubmissionWhereInput = {
      companyId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.employeeSubmission.findMany({
        where,
        include: SUBMISSION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employeeSubmission.count({ where }),
    ]);
    return {
      data: await this.withUsers(data),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMine(companyId: string, userId: string) {
    const data = await this.prisma.employeeSubmission.findMany({
      where: { companyId, userId },
      include: SUBMISSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const submission = await this.prisma.employeeSubmission.findFirst({
      where: { id, companyId },
      include: SUBMISSION_INCLUDE,
    });
    if (!submission) throw new NotFoundException('Документът не е намерен');
    const [enriched] = await this.withUsers([submission]);
    return enriched;
  }

  /** Ownership guard за файлове към входящ документ от самия служител. */
  async assertOwn(companyId: string, id: string, userId: string) {
    const submission = await this.prisma.employeeSubmission.findFirst({
      where: { id, companyId },
      select: { userId: true, status: true },
    });
    if (!submission) throw new NotFoundException('Документът не е намерен');
    if (submission.userId !== userId) {
      throw new ForbiddenException('Нямате достъп до този документ');
    }
    return submission;
  }

  /** HR: смяна на статус / отговор. Отговорът се съобщава на служителя. */
  async answer(
    companyId: string,
    id: string,
    actor: { id: string; email?: string },
    dto: { status: EmployeeSubmissionStatus; answer?: string },
  ) {
    const submission = await this.findOne(companyId, id);
    const updated = await this.prisma.employeeSubmission.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'ANSWERED'
          ? {
              answer: dto.answer ?? null,
              answeredById: actor.id,
              answeredAt: new Date(),
            }
          : {}),
      },
      include: SUBMISSION_INCLUDE,
    });

    if (dto.status === 'ANSWERED') {
      this.push
        .sendToUser(submission.userId, {
          title: `Отговор по ${submission.regNumber}`,
          body: dto.answer || submission.subject,
          url: `/dashboard/${companyId}/employee-records/my`,
          tag: `submission-${id}`,
        })
        .catch((err) =>
          this.logger.error('Failed to push submission answer', err),
        );
    }

    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: submission.userId,
      entityType: 'employeeSubmission',
      entityId: id,
      detail: `${submission.regNumber} → ${dto.status}`,
    });

    return updated;
  }

  private async withUsers<T extends { userId: string }>(rows: T[]) {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({ ...r, user: map.get(r.userId) ?? null }));
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
      tag: `submissions-${companyId}`,
    });
  }
}
