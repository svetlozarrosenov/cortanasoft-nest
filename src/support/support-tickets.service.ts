import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { decodeUploadedFileName } from '../common/utils/upload-filename';
import {
  CreateSupportTicketDto,
  CreateSupportTicketMessageDto,
  UpdateSupportTicketDto,
  QuerySupportTicketsDto,
} from './dto';
import { Prisma, SupportTicketStatus } from '@prisma/client';

// Базова инфо за автор на тикет/съобщение (без чувствителни полета)
const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const messageInclude = {
  author: { select: authorSelect },
  attachments: true,
} satisfies Prisma.SupportTicketMessageInclude;

// Кой гледа тикетите: фирмата-клиент или екипът на СВ Софт. Непрочетено е
// само това, което идва от отсрещната страна.
export interface Viewer {
  userId: string;
  side: 'customer' | 'support';
}

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
    private uploads: UploadsService,
  ) {}

  // ==================== КЛИЕНТСКА СТРАНА (company-scoped) ====================

  /**
   * Създаване на тикет от фирма-наемател. Тикетът носи companyId на фирмата.
   * Номерът е пореден per-company.
   */
  async createForCompany(
    companyId: string,
    userId: string,
    dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.prisma.$transaction(async (tx) => {
      const last = await tx.supportTicket.findFirst({
        where: { companyId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      return tx.supportTicket.create({
        data: {
          number,
          subject: dto.subject,
          description: dto.description,
          priority: dto.priority,
          category: dto.category,
          companyId,
          createdById: userId,
        },
        include: {
          createdBy: { select: authorSelect },
          company: { select: { id: true, name: true } },
        },
      });
    });

    // Fire-and-forget: push до екипа на Кортана за нов тикет
    this.notifySupport(ticket.id, {
      title: `Нов тикет #${ticket.number}`,
      body: `${ticket.company.name}: ${ticket.subject}`,
    }).catch((err) =>
      this.logger.error('Failed to push support of new ticket', err),
    );

    return ticket;
  }

  /**
   * Списък с тикети на конкретна фирма (нейните потребители виждат само своите).
   */
  async findAllForCompany(
    companyId: string,
    userId: string,
    query: QuerySupportTicketsDto,
  ) {
    const where = this.buildWhere({ ...query, companyId });
    return this.paginate(where, query, { userId, side: 'customer' });
  }

  /** Брой тикети на фирмата с непрочетени отговори от СВ Софт (бадж в менюто) */
  async countUnreadForCompany(companyId: string, userId: string) {
    const unread = await this.unreadByTicket(
      { userId, side: 'customer' },
      { companyId },
    );
    return unread.size;
  }

  /**
   * Един тикет на фирмата (с цялата нишка). Хвърля 404 ако не е на тази фирма.
   * Отварянето го маркира като прочетен за този потребител.
   */
  async findOneForCompany(companyId: string, userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, companyId },
      include: this.detailInclude(),
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
    await this.markRead(id, userId);
    return ticket;
  }

  /**
   * Клиентът добавя съобщение в нишката. Ако тикетът е чакал клиента/решен —
   * връща го в IN_PROGRESS (нова информация за support).
   */
  async addCustomerMessage(
    companyId: string,
    userId: string,
    id: string,
    dto: CreateSupportTicketMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, companyId },
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: userId,
        isFromSupport: false,
        body: dto.body,
      },
      include: messageInclude,
    });

    const reopen =
      ticket.status === SupportTicketStatus.WAITING_CUSTOMER ||
      ticket.status === SupportTicketStatus.RESOLVED ||
      ticket.status === SupportTicketStatus.CLOSED;

    await this.prisma.supportTicket.update({
      where: { id },
      data: reopen ? { status: SupportTicketStatus.IN_PROGRESS } : {},
    });

    await this.markRead(id, userId);

    this.notifySupport(id, {
      title: `Нов отговор по тикет #${ticket.number}`,
      body: ticket.subject,
    }).catch((err) =>
      this.logger.error('Failed to push support of customer reply', err),
    );

    return message;
  }

  // ==================== АДМИН СТРАНА (super-admin / OWNER) ====================

  /**
   * Всички тикети от всички компании (само за OWNER). Поддържа филтър по фирма.
   */
  async findAllAdmin(userId: string, query: QuerySupportTicketsDto) {
    const where = this.buildWhere(query);
    return this.paginate(where, query, { userId, side: 'support' }, true);
  }

  async findOneAdmin(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.detailInclude(/* withCompany */ true),
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
    await this.markRead(id, userId);
    return ticket;
  }

  /**
   * Support отговаря в нишката. Подразбиращо местене към IN_PROGRESS.
   */
  async addSupportMessage(
    userId: string,
    id: string,
    dto: CreateSupportTicketMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }

    const message = await this.prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        authorId: userId,
        isFromSupport: true,
        body: dto.body,
      },
      include: messageInclude,
    });

    // Поеми тикета при първи отговор + премести в IN_PROGRESS ако е още нов
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId: ticket.assignedToId ?? userId,
        status:
          ticket.status === SupportTicketStatus.NEW
            ? SupportTicketStatus.IN_PROGRESS
            : ticket.status,
      },
    });

    await this.markRead(id, userId);

    // Push до фирмата-клиент; отваря направо тикета
    this.notifyCustomer(ticket.companyId, ticket.id, {
      title: `Отговор по тикет #${ticket.number}`,
      body: ticket.subject,
    }).catch((err) =>
      this.logger.error('Failed to push customer of support reply', err),
    );

    return message;
  }

  /**
   * Промяна на статус/приоритет/категория/assignee (само admin).
   */
  async updateAdmin(id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }

    const data: Prisma.SupportTicketUpdateInput = {};
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.assignedToId !== undefined) {
      if (dto.assignedToId) {
        // Тикетът може да се възлага само на потребител от админ компанията (OWNER).
        const ownerMembership = await this.prisma.userCompany.findFirst({
          where: { userId: dto.assignedToId, company: { role: 'OWNER' } },
          select: { userId: true },
        });
        if (!ownerMembership) {
          throw new BadRequestException(
            'Тикетът може да се възлага само на потребители от админ компанията',
          );
        }
      }
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      data.resolvedAt =
        dto.status === SupportTicketStatus.RESOLVED ? new Date() : null;
      data.closedAt =
        dto.status === SupportTicketStatus.CLOSED ? new Date() : null;
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data,
      include: this.detailInclude(true),
    });
  }

  async removeAdmin(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
    await this.prisma.supportTicket.delete({ where: { id } });
  }

  /**
   * Статистика по статус — за бадж/брояч в админ менюто.
   */
  async getStats(userId: string) {
    const unread = await this.unreadByTicket({ userId, side: 'support' }, {});
    const grouped = await this.prisma.supportTicket.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = grouped.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count._all;
      return acc;
    }, {});
    const open =
      (byStatus[SupportTicketStatus.NEW] ?? 0) +
      (byStatus[SupportTicketStatus.IN_PROGRESS] ?? 0) +
      (byStatus[SupportTicketStatus.WAITING_CUSTOMER] ?? 0);
    return { byStatus, open, unread: unread.size };
  }

  // ==================== ПРИКАЧЕНИ ФАЙЛОВЕ ====================
  // Същият модел като при казусите: R2 (private bucket), преглед през бекенда.
  // companyId = клиентска страна (само тикети на фирмата); без него — СВ Софт.

  async addAttachment(
    id: string,
    file: Express.Multer.File,
    messageId?: string,
    companyId?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, ...(companyId && { companyId }) },
      select: { id: true, companyId: true },
    });
    if (!ticket) throw new NotFoundException('Тикетът не е намерен');
    if (messageId) {
      const msg = await this.prisma.supportTicketMessage.findFirst({
        where: { id: messageId, ticketId: ticket.id },
        select: { id: true },
      });
      if (!msg) throw new NotFoundException('Съобщението не е намерено');
    }

    const { key } = await this.uploads.uploadFile(
      ticket.companyId,
      'support',
      file,
    );
    return this.prisma.supportTicketAttachment.create({
      data: {
        ticketId: ticket.id,
        messageId: messageId ?? null,
        fileName: decodeUploadedFileName(file.originalname),
        fileUrl: key,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  async getAttachmentStream(
    id: string,
    attachmentId: string,
    companyId?: string,
  ) {
    const att = await this.prisma.supportTicketAttachment.findFirst({
      where: {
        id: attachmentId,
        ticketId: id,
        ...(companyId && { ticket: { companyId } }),
      },
    });
    if (!att) throw new NotFoundException('Файлът не е намерен');
    const { stream, contentType } = await this.uploads.getFile(att.fileKey);
    return { stream, contentType, fileName: att.fileName };
  }

  async removeAttachment(id: string, attachmentId: string) {
    const att = await this.prisma.supportTicketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });
    if (!att) throw new NotFoundException('Файлът не е намерен');
    await this.prisma.supportTicketAttachment.delete({ where: { id: att.id } });
    await this.uploads
      .deleteFile(att.fileKey)
      .catch((err) =>
        this.logger.warn(`R2 delete failed ${att.fileKey}: ${err}`),
      );
    return { success: true };
  }

  // ==================== ПОМОЩНИ ====================

  private buildWhere(
    query: QuerySupportTicketsDto & { companyId?: string },
  ): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.companyId) where.companyId = query.companyId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  // Тикетите с непрочетено за потребителя излизат най-отгоре, после останалите
  // в поискания ред. Партицията става в паметта по id-та (тикетите са малко),
  // пълните данни се зареждат само за страницата.
  private async paginate(
    where: Prisma.SupportTicketWhereInput,
    query: QuerySupportTicketsDto,
    viewer: Viewer,
    withCompany = false,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [ordered, unread] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        select: { id: true },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.unreadByTicket(viewer, { where }),
    ]);
    const ids = [
      ...ordered.filter((t) => unread.has(t.id)),
      ...ordered.filter((t) => !unread.has(t.id)),
    ]
      .slice((page - 1) * limit, page * limit)
      .map((t) => t.id);

    const rows = await this.prisma.supportTicket.findMany({
      where: { id: { in: ids } },
      include: {
        createdBy: { select: authorSelect },
        assignedTo: { select: authorSelect },
        ...(withCompany
          ? { company: { select: { id: true, name: true } } }
          : {}),
        _count: { select: { messages: true } },
      },
    });
    const data = ids.flatMap((id) =>
      rows
        .filter((r) => r.id === id)
        .map((r) => ({ ...r, unreadCount: unread.get(id) ?? 0 })),
    );

    const total = ordered.length;
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ----- Непрочетени (на ниво потребител) -----

  /** Отварянето/отговарянето маркира тикета като прочетен за потребителя */
  private async markRead(ticketId: string, userId: string) {
    const lastReadAt = new Date();
    await this.prisma.supportTicketRead.upsert({
      where: { ticketId_userId: { ticketId, userId } },
      create: { ticketId, userId, lastReadAt },
      update: { lastReadAt },
    });
  }

  /**
   * id на тикет → брой непрочетени за потребителя. Непрочетено е съобщение от
   * отсрещната страна след последното отваряне; за екипа на СВ Софт и самият
   * тикет, ако никога не е отварян (описанието е първото съобщение).
   */
  private async unreadByTicket(
    viewer: Viewer,
    scope: { companyId?: string; where?: Prisma.SupportTicketWhereInput },
  ): Promise<Map<string, number>> {
    const where = scope.where ?? { companyId: scope.companyId };
    const tickets = await this.prisma.supportTicket.findMany({
      where,
      select: { id: true, createdAt: true },
    });
    if (tickets.length === 0) return new Map();
    const ids = tickets.map((t) => t.id);

    const [reads, messages] = await Promise.all([
      this.prisma.supportTicketRead.findMany({
        where: { userId: viewer.userId, ticketId: { in: ids } },
      }),
      this.prisma.supportTicketMessage.findMany({
        where: {
          ticketId: { in: ids },
          isFromSupport: viewer.side === 'customer',
        },
        select: { ticketId: true, createdAt: true },
      }),
    ]);
    const lastRead = new Map(
      reads.map((r) => [r.ticketId, r.lastReadAt.getTime()]),
    );

    const unread = new Map<string, number>();
    const bump = (ticketId: string) =>
      unread.set(ticketId, (unread.get(ticketId) ?? 0) + 1);
    if (viewer.side === 'support') {
      for (const t of tickets) {
        if (t.createdAt.getTime() > (lastRead.get(t.id) ?? 0)) bump(t.id);
      }
    }
    for (const m of messages) {
      if (m.createdAt.getTime() > (lastRead.get(m.ticketId) ?? 0))
        bump(m.ticketId);
    }
    return unread;
  }

  private detailInclude(withCompany = false) {
    return {
      createdBy: { select: authorSelect },
      assignedTo: { select: authorSelect },
      ...(withCompany
        ? { company: { select: { id: true, name: true, email: true } } }
        : {}),
      attachments: true,
      messages: {
        include: messageInclude,
        orderBy: { createdAt: 'asc' as const },
      },
    } satisfies Prisma.SupportTicketInclude;
  }

  // ----- Известия: push до екипа на СВ Софт (OWNER) -----

  /**
   * Праща push до потребителите на OWNER компанията, чиято роля има право
   * за support тикетите (support.tickets → view — същото право, което
   * показва страницата Поддръжка). Гейтнато и от
   * Company.pushNotificationsEnabled (мастер ключът в настройките). Best-effort.
   */
  private async notifySupport(
    ticketId: string,
    payload: { title: string; body: string },
  ) {
    const owner = await this.prisma.company.findFirst({
      where: { role: 'OWNER' },
      select: { id: true, pushNotificationsEnabled: true },
    });
    if (!owner || !owner.pushNotificationsEnabled) return;

    const members = await this.prisma.userCompany.findMany({
      where: { companyId: owner.id },
      select: { userId: true, role: { select: { permissions: true } } },
    });

    const userIds = members
      .filter((m) => this.roleCanHandleSupport(m.role?.permissions))
      .map((m) => m.userId);
    if (userIds.length === 0) return;

    // Админ изгледът живее в страницата Поддръжка на OWNER фирмата
    await this.pushService.sendToUsers(userIds, {
      ...payload,
      url: `/dashboard/${owner.id}/support?ticket=${ticketId}`,
      tag: `support-ticket-${ticketId}`,
      data: { ticketId },
    });
  }

  /**
   * Push до фирмата-клиент при отговор от СВ Софт — до потребителите ѝ с право
   * support.tickets → view, ако фирмата има включени push известия.
   */
  private async notifyCustomer(
    companyId: string,
    ticketId: string,
    payload: { title: string; body: string },
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { pushNotificationsEnabled: true },
    });
    if (!company?.pushNotificationsEnabled) return;

    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      select: { userId: true, role: { select: { permissions: true } } },
    });
    const userIds = members
      .filter((m) => this.roleCanHandleSupport(m.role?.permissions))
      .map((m) => m.userId);
    if (userIds.length === 0) return;

    await this.pushService.sendToUsers(userIds, {
      ...payload,
      url: `/dashboard/${companyId}/support?ticket=${ticketId}`,
      tag: `support-ticket-${ticketId}`,
      data: { ticketId },
    });
  }

  /**
   * Има ли ролята право да обработва support тикети (support.tickets → view).
   * Ключовете са тези от permissions.config.ts — модул `support`, страница
   * `tickets`; преди се проверяваше несъществуващ `admin.supportTickets` и
   * push никога не стигаше до никого.
   */
  private roleCanHandleSupport(permissions: unknown): boolean {
    const support = (permissions as any)?.modules?.support;
    const page = support?.pages?.tickets;
    return Boolean(support?.enabled && page?.enabled && page?.actions?.view);
  }
}
