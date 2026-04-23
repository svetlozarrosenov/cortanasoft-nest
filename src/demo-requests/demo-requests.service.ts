import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { MailService } from '../mail/mail.service';
import {
  CreateDemoRequestDto,
  UpdateDemoRequestDto,
  QueryDemoRequestsDto,
  CreateDemoRequestTaskDto,
  UpdateDemoRequestTaskDto,
  CreateDemoRequestNoteDto,
  UpdateDemoRequestNoteDto,
} from './dto';
import { Prisma, DemoRequestStatus } from '@prisma/client';

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private pushNotificationsService: PushNotificationsService,
    private mailService: MailService,
  ) {}

  /**
   * Create a new demo request (public endpoint, no auth required)
   */
  async create(dto: CreateDemoRequestDto) {
    const demoRequest = await this.prisma.demoRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        employeeCount: dto.employeeCount,
        message: dto.message,
        status: DemoRequestStatus.NEW,
      },
    });

    // Fire-and-forget: send notifications without blocking the response
    this.sendNotifications(dto).catch((error) => {
      this.logger.error('Unexpected error in demo request notifications', error);
    });

    return demoRequest;
  }

  /**
   * Send all notifications for a new demo request (runs in background)
   */
  private async sendNotifications(dto: CreateDemoRequestDto) {
    // Push notification — само на svetlozarrosenov@gmail.com и само ако е член на OWNER компания
    try {
      const ownerUser = await this.prisma.userCompany.findFirst({
        where: {
          company: { role: 'OWNER' },
          user: { email: 'svetlozarrosenov@gmail.com' },
        },
        select: { userId: true },
      });

      if (ownerUser) {
        await this.pushNotificationsService.sendToUsers([ownerUser.userId], {
          title: '🚀 Нова заявка за демо',
          body: `${dto.companyName} — ${dto.name}\n📧 ${dto.email} · 📞 ${dto.phone}`,
          url: '/dashboard/admin/demo-requests',
          tag: 'demo-request',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification for demo request', error);
    }

    // Email notification to admin
    try {
      await this.mailService.send({
        to: process.env.ADMIN_EMAIL || 'svetlozarrosenov@gmail.com',
        subject: `Нова заявка за демо от ${dto.companyName || dto.name}`,
        html: this.buildAdminNotificationEmail(dto),
      });
    } catch (error) {
      this.logger.error('Failed to send admin email notification for demo request', error);
    }

    // Confirmation email to the requester
    try {
      await this.mailService.send({
        to: dto.email,
        subject: 'CortanaSoft — Потвърждение за заявка за демо',
        html: this.buildConfirmationEmail(dto.name, dto.companyName),
      });
    } catch (error) {
      this.logger.error('Failed to send confirmation email to requester', error);
    }
  }

  /**
   * Get all demo requests with pagination and filters (admin only)
   */
  async findAll(query: QueryDemoRequestsDto) {
    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.DemoRequestWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.demoRequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.demoRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single demo request by ID with tasks and notes timeline (admin only)
   */
  async findOne(id: string) {
    const demoRequest = await this.prisma.demoRequest.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }] },
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!demoRequest) {
      throw new NotFoundException('Demo request not found');
    }

    return demoRequest;
  }

  /**
   * Update a demo request (admin only)
   */
  async update(id: string, dto: UpdateDemoRequestDto) {
    await this.ensureExists(id);

    return this.prisma.demoRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.contactedAt && { contactedAt: new Date(dto.contactedAt) }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.completedAt && { completedAt: new Date(dto.completedAt) }),
      },
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.demoRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Demo request not found');
    }
  }

  // ==================== TASKS ====================

  async createTask(demoRequestId: string, dto: CreateDemoRequestTaskDto) {
    await this.ensureExists(demoRequestId);
    return this.prisma.demoRequestTask.create({
      data: {
        demoRequestId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async updateTask(
    demoRequestId: string,
    taskId: string,
    dto: UpdateDemoRequestTaskDto,
  ) {
    const task = await this.prisma.demoRequestTask.findUnique({
      where: { id: taskId },
    });
    if (!task || task.demoRequestId !== demoRequestId) {
      throw new NotFoundException('Task not found');
    }

    const data: Prisma.DemoRequestTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.dueDate !== undefined) {
      data.dueDate = new Date(dto.dueDate);
      // Resetting dueDate forward should re-enable notification
      if (!task.completed && new Date(dto.dueDate) > new Date()) {
        data.notifiedAt = null;
      }
    }
    if (dto.completed !== undefined) {
      data.completed = dto.completed;
      data.completedAt = dto.completed ? new Date() : null;
    }

    return this.prisma.demoRequestTask.update({
      where: { id: taskId },
      data,
    });
  }

  async deleteTask(demoRequestId: string, taskId: string) {
    const task = await this.prisma.demoRequestTask.findUnique({
      where: { id: taskId },
      select: { id: true, demoRequestId: true },
    });
    if (!task || task.demoRequestId !== demoRequestId) {
      throw new NotFoundException('Task not found');
    }
    await this.prisma.demoRequestTask.delete({ where: { id: taskId } });
  }

  // ==================== NOTES ====================

  async createNote(demoRequestId: string, dto: CreateDemoRequestNoteDto) {
    await this.ensureExists(demoRequestId);
    return this.prisma.demoRequestNote.create({
      data: {
        demoRequestId,
        content: dto.content,
      },
    });
  }

  async updateNote(
    demoRequestId: string,
    noteId: string,
    dto: UpdateDemoRequestNoteDto,
  ) {
    const note = await this.prisma.demoRequestNote.findUnique({
      where: { id: noteId },
      select: { id: true, demoRequestId: true },
    });
    if (!note || note.demoRequestId !== demoRequestId) {
      throw new NotFoundException('Note not found');
    }
    return this.prisma.demoRequestNote.update({
      where: { id: noteId },
      data: { content: dto.content },
    });
  }

  async deleteNote(demoRequestId: string, noteId: string) {
    const note = await this.prisma.demoRequestNote.findUnique({
      where: { id: noteId },
      select: { id: true, demoRequestId: true },
    });
    if (!note || note.demoRequestId !== demoRequestId) {
      throw new NotFoundException('Note not found');
    }
    await this.prisma.demoRequestNote.delete({ where: { id: noteId } });
  }

  /**
   * Delete a demo request (admin only)
   */
  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.demoRequest.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for demo requests (admin only)
   */
  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.demoRequest.count(),
      this.prisma.demoRequest.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: statusCounts,
    };
  }

  /**
   * Get all possible statuses
   */
  getStatuses() {
    return Object.values(DemoRequestStatus);
  }

  private buildAdminNotificationEmail(dto: CreateDemoRequestDto): string {
    const now = new Date();
    const timeStr = now.toLocaleString('bg-BG', { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const rows = [
      { label: 'Име', value: dto.name },
      { label: 'Фирма', value: dto.companyName },
      { label: 'Email', value: dto.email, href: `mailto:${dto.email}` },
      { label: 'Телефон', value: dto.phone, href: `tel:${dto.phone}` },
      ...(dto.employeeCount ? [{ label: 'Брой служители', value: dto.employeeCount }] : []),
      ...(dto.message ? [{ label: 'Съобщение', value: dto.message }] : []),
    ];

    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td style="padding:12px 16px;color:#71717a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f4f4f5;">${r.label}</td>
          <td style="padding:12px 16px;color:#18181b;font-size:15px;border-bottom:1px solid #f4f4f5;">${r.href ? `<a href="${r.href}" style="color:#4f46e5;text-decoration:none;">${r.value}</a>` : r.value}</td>
        </tr>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Нова заявка за демо</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${dto.companyName || dto.name}</h1>
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;">${timeStr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Data -->
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableRows}
              </table>
            </td>
          </tr>

          <!-- Actions -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="https://cortanasoft.com/dashboard/admin/demo-requests" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Виж в админ панела
                    </a>
                  </td>
                  <td>
                    <a href="tel:${dto.phone}" style="display:inline-block;padding:12px 24px;background:#f4f4f5;color:#3f3f46;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Обади се
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildConfirmationEmail(name: string, companyName?: string): string {
    const firstName = name.split(' ')[0];
    return `
<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">CortanaSoft</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">ERP &bull; CRM &bull; HR &bull; Управление на проекти</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:600;">Здравейте, ${firstName}!</h2>

              <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Получихме заявката Ви за демонстрация${companyName ? ` на <strong>${companyName}</strong>` : ''}.
              </p>

              <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.7;font-weight:600;">
                Какво следва?
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">1</span>
                    Ще Ви се обадим, за да насрочим демонстрация
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">2</span>
                    30-минутна среща, фокусирана върху Вашите нужди
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">3</span>
                    Индивидуална оферта, съобразена с Вашите нужди
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Ако искате да ускорите процеса или имате конкретни въпроси &mdash; пишете ни на
                <a href="mailto:info@cortanasoft.com" style="color:#4f46e5;text-decoration:none;font-weight:500;">info@cortanasoft.com</a>
                или се обадете на <a href="tel:+359876649967" style="color:#4f46e5;text-decoration:none;font-weight:500;">+359 87 664 9967</a>.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;">
                    <a href="https://cortanasoft.com" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Разгледайте cortanasoft.com &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;color:#71717a;font-size:13px;text-align:center;">
                CortanaSoft &mdash; Вашият бизнес, една платформа.
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} CortanaSoft. Всички права запазени.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
