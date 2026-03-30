import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { MailService } from '../mail/mail.service';
import {
  CreateContactSubmissionDto,
  UpdateContactSubmissionDto,
  QueryContactSubmissionsDto,
} from './dto';
import { Prisma, ContactSubmissionStatus } from '@prisma/client';

@Injectable()
export class ContactSubmissionsService {
  private readonly logger = new Logger(ContactSubmissionsService.name);

  constructor(
    private prisma: PrismaService,
    private pushNotificationsService: PushNotificationsService,
    private mailService: MailService,
  ) {}

  /**
   * Create a new contact submission (public endpoint, no auth required)
   */
  async create(dto: CreateContactSubmissionDto) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: dto.name,
        email: dto.email,
        company: dto.company,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
        status: ContactSubmissionStatus.NEW,
      },
    });

    // Fire-and-forget: send notifications without blocking the response
    this.sendNotifications(dto).catch((error) => {
      this.logger.error('Unexpected error in contact submission notifications', error);
    });

    return submission;
  }

  /**
   * Send notifications for a new contact submission (runs in background)
   */
  private async sendNotifications(dto: CreateContactSubmissionDto) {
    // Push notification to super admins
    try {
      const ownerCompanyUsers = await this.prisma.userCompany.findMany({
        where: { company: { role: 'OWNER' } },
        select: { userId: true },
      });

      const adminUserIds = [...new Set(ownerCompanyUsers.map((uc) => uc.userId))];

      if (adminUserIds.length > 0) {
        await this.pushNotificationsService.sendToUsers(adminUserIds, {
          title: '📩 Ново запитване',
          body: `${dto.name}${dto.company ? ` · ${dto.company}` : ''}\n${dto.subject || dto.message?.substring(0, 80) || ''}`,
          url: '/dashboard/admin/contact-submissions',
          tag: 'contact-submission',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification for contact submission', error);
    }

    // Email notification to admin
    try {
      await this.mailService.send({
        to: process.env.ADMIN_EMAIL || 'svetlozarrosenov@gmail.com',
        subject: `Ново запитване от ${dto.name}${dto.company ? ` (${dto.company})` : ''}`,
        html: this.buildAdminNotificationEmail(dto),
      });
    } catch (error) {
      this.logger.error('Failed to send admin email for contact submission', error);
    }
  }

  private buildAdminNotificationEmail(dto: CreateContactSubmissionDto): string {
    const now = new Date();
    const timeStr = now.toLocaleString('bg-BG', { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const rows = [
      { label: 'Име', value: dto.name },
      ...(dto.company ? [{ label: 'Фирма', value: dto.company }] : []),
      { label: 'Email', value: dto.email, href: `mailto:${dto.email}` },
      ...(dto.phone ? [{ label: 'Телефон', value: dto.phone, href: `tel:${dto.phone}` }] : []),
      ...(dto.subject ? [{ label: 'Тема', value: dto.subject }] : []),
      ...(dto.message ? [{ label: 'Съобщение', value: dto.message }] : []),
    ];

    const tableRows = rows
      .map(
        (r: { label: string; value: string; href?: string }) => `
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
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Ново запитване</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${dto.name}${dto.company ? ` — ${dto.company}` : ''}</h1>
                  </td>
                  <td style="text-align:right;vertical-align:top;">
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;">${timeStr}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${tableRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="https://cortanasoft.com/dashboard/admin/contact-submissions" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                Виж в админ панела
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Get all contact submissions with pagination and filters (admin only)
   */
  async findAll(query: QueryContactSubmissionsDto) {
    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ContactSubmissionWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactSubmission.count({ where }),
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
   * Get a single contact submission by ID (admin only)
   */
  async findOne(id: string) {
    const submission = await this.prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    return submission;
  }

  /**
   * Update a contact submission (admin only)
   */
  async update(id: string, dto: UpdateContactSubmissionDto) {
    await this.findOne(id);

    return this.prisma.contactSubmission.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.repliedAt && { repliedAt: new Date(dto.repliedAt) }),
      },
    });
  }

  /**
   * Delete a contact submission (admin only)
   */
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.contactSubmission.delete({
      where: { id },
    });
  }

  /**
   * Get statistics for contact submissions (admin only)
   */
  async getStats() {
    const [total, byStatus] = await Promise.all([
      this.prisma.contactSubmission.count(),
      this.prisma.contactSubmission.groupBy({
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
    return Object.values(ContactSubmissionStatus);
  }
}
