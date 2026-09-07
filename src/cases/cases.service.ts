import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { checkPermission } from '../common/guards/permissions.guard';
import { RolePermissions } from '../common/config/permissions.config';
import {
  CaseListView,
  CreateCaseDto,
  CreateCaseMessageDto,
  QueryCasesDto,
  UpdateCaseDto,
} from './dto';

/**
 * Казуси (Cases) — клиентски тикети на фирмата-наемател.
 *
 * НЕ бъркай с:
 *  - SupportTicket* (support/) — тикети от наемателите към СВ Софт;
 *  - Ticket* (tickets/)       — вътрешни задачи / спринтове.
 *
 * Тук клиентът на фирмата (Customer) е външна страна: няма акаунт, чете
 * казуса по публичен токен (/case/:token) и може да отговаря оттам.
 * Cortana НЕ праща имейли на клиента — фирмата копира линка и го праща сама.
 */

const caseUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const caseCustomerSelect = {
  id: true,
  companyName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} satisfies Prisma.CustomerSelect;

const caseListInclude = {
  customer: { select: caseCustomerSelect },
  assignedTo: { select: caseUserSelect },
  createdBy: { select: caseUserSelect },
  _count: { select: { messages: true, attachments: true } },
} satisfies Prisma.CustomerCaseInclude;

const caseDetailInclude = {
  customer: { select: caseCustomerSelect },
  assignedTo: { select: caseUserSelect },
  createdBy: { select: caseUserSelect },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: {
      authorUser: { select: caseUserSelect },
      attachments: true,
    },
  },
  // Прикачени към самия казус (не към съобщение)
  attachments: { where: { messageId: null }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CustomerCaseInclude;

const OPEN_STATUSES: CaseStatus[] = ['NEW', 'OPEN', 'WAITING_CUSTOMER'];

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
    private uploads: UploadsService,
  ) {}

  // ==================== СПИСЪК / ФИЛТРИ ====================

  private buildWhere(
    companyId: string,
    userId: string,
    query: QueryCasesDto,
  ): Prisma.CustomerCaseWhereInput {
    const where: Prisma.CustomerCaseWhereInput = { companyId };

    switch (query.view) {
      case 'open':
        where.status = { in: OPEN_STATUSES };
        break;
      case 'mine':
        where.assignedToId = userId;
        where.status = { in: OPEN_STATUSES };
        break;
      case 'waiting':
        where.status = 'WAITING_CUSTOMER';
        break;
    }

    // Изричен статус филтър има предимство пред изгледа
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.channel) where.channel = query.channel;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.customerId) where.customerId = query.customerId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { caseNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { customer: { companyName: { contains: q, mode: 'insensitive' } } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async findAll(companyId: string, userId: string, query: QueryCasesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(companyId, userId, query);

    const [data, total] = await Promise.all([
      this.prisma.customerCase.findMany({
        where,
        include: caseListInclude,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customerCase.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Броячи за табовете (без другите филтри — само изгледът). */
  async summary(companyId: string, userId: string) {
    const count = (view: CaseListView) =>
      this.prisma.customerCase.count({
        where: this.buildWhere(companyId, userId, { view }),
      });
    const [open, mine, waiting, all] = await Promise.all([
      count('open'),
      count('mine'),
      count('waiting'),
      count('all'),
    ]);
    return { open, mine, waiting, all };
  }

  /** Потребители на фирмата, на които може да се възложи казус. */
  async assignees(companyId: string) {
    const rows = await this.prisma.userCompany.findMany({
      where: { companyId, user: { isActive: true } },
      select: { user: { select: caseUserSelect } },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });
    return rows.map((r) => r.user);
  }

  // ==================== CRUD ====================

  async findOne(companyId: string, id: string) {
    const item = await this.prisma.customerCase.findFirst({
      where: { id, companyId },
      include: caseDetailInclude,
    });
    if (!item) throw new NotFoundException('Казусът не е намерен');
    return item;
  }

  private async assertAssignee(companyId: string, userId: string) {
    const member = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Отговорникът трябва да е потребител на фирмата',
      );
    }
  }

  async create(companyId: string, userId: string, dto: CreateCaseDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: caseCustomerSelect,
    });
    if (!customer) throw new NotFoundException('Клиентът не е намерен');
    if (dto.assignedToId)
      await this.assertAssignee(companyId, dto.assignedToId);

    const customerName =
      customer.companyName ||
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      null;

    const created = await this.prisma.$transaction(async (tx) => {
      const caseNumber = await this.nextCaseNumber(tx, companyId);
      return tx.customerCase.create({
        data: {
          caseNumber,
          companyId,
          customerId: customer.id,
          contactName: dto.contactName ?? customerName,
          contactEmail: dto.contactEmail ?? customer.email ?? null,
          contactPhone: dto.contactPhone ?? customer.phone ?? null,
          subject: dto.subject,
          description: dto.description,
          priority: dto.priority ?? 'MEDIUM',
          channel: dto.channel ?? 'EMAIL',
          assignedToId: dto.assignedToId ?? null,
          createdById: userId,
          publicToken: randomBytes(24).toString('hex'),
        },
      });
    });

    return this.findOne(companyId, created.id);
  }

  /** CASE-YYYY-NNNNN, пореден per-company за годината, в транзакция. */
  private async nextCaseNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
  ) {
    const year = new Date().getFullYear();
    const prefix = `CASE-${year}-`;
    const last = await tx.customerCase.findFirst({
      where: { companyId, caseNumber: { startsWith: prefix } },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });
    const seq = last ? parseInt(last.caseNumber.slice(prefix.length), 10) : 0;
    return `${prefix}${String((Number.isNaN(seq) ? 0 : seq) + 1).padStart(5, '0')}`;
  }

  async update(companyId: string, id: string, dto: UpdateCaseDto) {
    const existing = await this.findOne(companyId, id);
    if (dto.assignedToId)
      await this.assertAssignee(companyId, dto.assignedToId);

    const data: Prisma.CustomerCaseUpdateInput = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.contactEmail !== undefined)
      data.contactEmail = dto.contactEmail || null;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== existing.status;
    if (statusChanged) {
      data.status = dto.status;
      data.resolvedAt = dto.status === 'RESOLVED' ? new Date() : null;
      data.closedAt = dto.status === 'CLOSED' ? new Date() : null;
    }

    await this.prisma.customerCase.update({ where: { id }, data });
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const existing = await this.findOne(companyId, id);
    const keys = await this.prisma.caseAttachment.findMany({
      where: { caseId: existing.id },
      select: { fileKey: true },
    });
    await this.prisma.customerCase.delete({ where: { id: existing.id } });
    for (const { fileKey } of keys) {
      await this.uploads
        .deleteFile(fileKey)
        .catch((err) =>
          this.logger.warn(`R2 delete failed ${fileKey}: ${err}`),
        );
    }
    return { success: true };
  }

  // ==================== СЪОБЩЕНИЯ ====================

  /**
   * Съобщение от екипа. Публичен отговор → казусът минава в „Чака клиент"
   * и при нужда се възлага на автора. Вътрешна бележка → нищо не се променя
   * по статуса.
   */
  async addMessage(
    companyId: string,
    userId: string,
    id: string,
    dto: CreateCaseMessageDto,
  ) {
    const existing = await this.findOne(companyId, id);
    const isPublic = dto.isPublic ?? false;

    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.caseMessage.create({
        data: {
          caseId: existing.id,
          body: dto.body,
          isPublic,
          isFromCustomer: false,
          authorUserId: userId,
        },
        include: { authorUser: { select: caseUserSelect }, attachments: true },
      });

      if (isPublic) {
        const data: Prisma.CustomerCaseUncheckedUpdateInput = {};
        if (!existing.assignedToId) data.assignedToId = userId;
        if (existing.status === 'NEW' || existing.status === 'OPEN') {
          data.status = 'WAITING_CUSTOMER';
        }
        if (Object.keys(data).length > 0) {
          await tx.customerCase.update({ where: { id: existing.id }, data });
        }
      } else {
        // само за да мръдне updatedAt
        await tx.customerCase.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
      }

      return msg;
    });
  }

  // ==================== ПРИКАЧЕНИ ФАЙЛОВЕ ====================

  async addAttachment(
    companyId: string,
    id: string,
    file: Express.Multer.File,
    messageId?: string,
  ) {
    const existing = await this.findOne(companyId, id);
    if (messageId) {
      const msg = await this.prisma.caseMessage.findFirst({
        where: { id: messageId, caseId: existing.id },
        select: { id: true },
      });
      if (!msg) throw new NotFoundException('Съобщението не е намерено');
    }

    const { key } = await this.uploads.uploadFile(companyId, 'cases', file);
    return this.prisma.caseAttachment.create({
      data: {
        caseId: existing.id,
        messageId: messageId ?? null,
        fileName: file.originalname,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  async getAttachmentStream(
    companyId: string,
    id: string,
    attachmentId: string,
  ) {
    const att = await this.prisma.caseAttachment.findFirst({
      where: { id: attachmentId, caseId: id, case: { companyId } },
    });
    if (!att) throw new NotFoundException('Файлът не е намерен');
    const { stream, contentType } = await this.uploads.getFile(att.fileKey);
    return { stream, contentType, fileName: att.fileName };
  }

  async removeAttachment(companyId: string, id: string, attachmentId: string) {
    const att = await this.prisma.caseAttachment.findFirst({
      where: { id: attachmentId, caseId: id, case: { companyId } },
    });
    if (!att) throw new NotFoundException('Файлът не е намерен');
    await this.prisma.caseAttachment.delete({ where: { id: att.id } });
    await this.uploads
      .deleteFile(att.fileKey)
      .catch((err) =>
        this.logger.warn(`R2 delete failed ${att.fileKey}: ${err}`),
      );
    return { success: true };
  }

  // ==================== ПУБЛИЧНА СТРАНИЦА (по токен) ====================

  private async findByToken(token: string) {
    if (!token || token.length < 32) throw new NotFoundException();
    const item = await this.prisma.customerCase.findUnique({
      where: { publicToken: token },
      include: {
        company: { select: { name: true } },
        assignedTo: { select: { id: true, firstName: true } },
        messages: {
          where: { isPublic: true },
          orderBy: { createdAt: 'asc' },
          include: {
            authorUser: { select: { firstName: true } },
            attachments: {
              select: {
                id: true,
                fileName: true,
                fileSize: true,
                mimeType: true,
              },
            },
          },
        },
        attachments: {
          where: { messageId: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, fileName: true, fileSize: true, mimeType: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Казусът не е намерен');
    return item;
  }

  /** Публичен изглед — без вътрешни ID-та, бележки и данни за екипа. */
  async publicView(token: string) {
    const item = await this.findByToken(token);
    return {
      caseNumber: item.caseNumber,
      subject: item.subject,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      resolvedAt: item.resolvedAt,
      companyName: item.company.name,
      canReply: item.status !== 'CLOSED',
      attachments: item.attachments,
      messages: item.messages.map((m) => ({
        id: m.id,
        body: m.body,
        isFromCustomer: m.isFromCustomer,
        authorName: m.isFromCustomer ? null : (m.authorUser?.firstName ?? null),
        createdAt: m.createdAt,
        attachments: m.attachments,
      })),
    };
  }

  /**
   * Отговор от клиента през публичната страница. Винаги публичен, без автор.
   * Казусът се отваря отново (вкл. от RESOLVED); от CLOSED не се приема.
   */
  async publicReply(token: string, body: string) {
    const item = await this.findByToken(token);
    if (item.status === 'CLOSED') {
      throw new ForbiddenException('Казусът е затворен и не приема отговори');
    }

    await this.prisma.$transaction([
      this.prisma.caseMessage.create({
        data: {
          caseId: item.id,
          body,
          isPublic: true,
          isFromCustomer: true,
          authorUserId: null,
        },
      }),
      this.prisma.customerCase.update({
        where: { id: item.id },
        data: { status: 'OPEN', resolvedAt: null },
      }),
    ]);

    await this.notifyTeam(item).catch((err) =>
      this.logger.warn(`Case ${item.caseNumber} push failed: ${err}`),
    );

    return { success: true };
  }

  /** Push до отговорника; ако няма — до всички с право да виждат казуси. */
  private async notifyTeam(item: {
    id: string;
    companyId: string;
    caseNumber: string;
    subject: string;
    assignedToId: string | null;
  }) {
    const enabled = await this.push.isCompanyEnabled(item.companyId);
    if (!enabled) return;

    const payload = {
      title: `Отговор по казус ${item.caseNumber}`,
      body: item.subject,
      url: `/dashboard/${item.companyId}/cases?view=${item.id}`,
      tag: `case-${item.id}`,
    };

    if (item.assignedToId) {
      await this.push.sendToUsers([item.assignedToId], payload);
      return;
    }

    const members = await this.prisma.userCompany.findMany({
      where: { companyId: item.companyId },
      select: { userId: true, role: { select: { permissions: true } } },
    });
    const userIds = members
      .filter((m) =>
        checkPermission(
          m.role.permissions as unknown as RolePermissions,
          'cases',
          'cases',
          'view',
        ),
      )
      .map((m) => m.userId);
    if (userIds.length > 0) await this.push.sendToUsers(userIds, payload);
  }

  async getPublicAttachmentStream(token: string, attachmentId: string) {
    const item = await this.findByToken(token);
    const att = await this.prisma.caseAttachment.findFirst({
      where: {
        id: attachmentId,
        caseId: item.id,
        OR: [{ messageId: null }, { message: { isPublic: true } }],
      },
    });
    if (!att) throw new NotFoundException('Файлът не е намерен');
    const { stream, contentType } = await this.uploads.getFile(att.fileKey);
    return { stream, contentType, fileName: att.fileName };
  }
}
