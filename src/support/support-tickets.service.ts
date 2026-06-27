import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
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

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushNotificationsService,
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
  async findAllForCompany(companyId: string, query: QuerySupportTicketsDto) {
    const where = this.buildWhere({ ...query, companyId });
    return this.paginate(where, query);
  }

  /**
   * Един тикет на фирмата (с цялата нишка). Хвърля 404 ако не е на тази фирма.
   */
  async findOneForCompany(companyId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, companyId },
      include: this.detailInclude(),
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
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
  async findAllAdmin(query: QuerySupportTicketsDto) {
    const where = this.buildWhere(query);
    return this.paginate(where, query, /* withCompany */ true);
  }

  async findOneAdmin(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: this.detailInclude(/* withCompany */ true),
    });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
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
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
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

    // Клиентът няма имейл/push известие — вижда отговора в самото приложение.

    return message;
  }

  /**
   * Промяна на статус/приоритет/категория/assignee (само admin).
   */
  async updateAdmin(id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
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
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Тикетът не е намерен');
    }
    await this.prisma.supportTicket.delete({ where: { id } });
  }

  /**
   * Статистика по статус — за бадж/брояч в админ менюто.
   */
  async getStats() {
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
    return { byStatus, open };
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

  private async paginate(
    where: Prisma.SupportTicketWhereInput,
    query: QuerySupportTicketsDto,
    withCompany = false,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          createdBy: { select: authorSelect },
          assignedTo: { select: authorSelect },
          ...(withCompany
            ? { company: { select: { id: true, name: true } } }
            : {}),
          _count: { select: { messages: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
   * за support тикетите (admin.supportTickets → view). Гейтнато и от
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

    await this.pushService.sendToUsers(userIds, {
      ...payload,
      url: `/dashboard/admin/support`,
      tag: `support-ticket-${ticketId}`,
      data: { ticketId },
    });
  }

  /**
   * Има ли ролята право да обработва support тикети (admin.supportTickets → view).
   */
  private roleCanHandleSupport(permissions: unknown): boolean {
    const admin = (permissions as any)?.modules?.admin;
    const page = admin?.pages?.supportTickets;
    return Boolean(admin?.enabled && page?.enabled && page?.actions?.view);
  }
}
