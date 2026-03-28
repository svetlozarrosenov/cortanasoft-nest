import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { MailService } from '../mail/mail.service';
import {
  CreateDemoRequestDto,
  UpdateDemoRequestDto,
  QueryDemoRequestsDto,
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

    // Send push notification to all super admin users (users in OWNER companies)
    try {
      const ownerCompanyUsers = await this.prisma.userCompany.findMany({
        where: { company: { role: 'OWNER' } },
        select: { userId: true },
      });

      const adminUserIds = [...new Set(ownerCompanyUsers.map((uc) => uc.userId))];

      if (adminUserIds.length > 0) {
        await this.pushNotificationsService.sendToUsers(adminUserIds, {
          title: 'Нова заявка за демо',
          body: `${dto.companyName} - ${dto.name}`,
          url: '/dashboard/admin/demo-requests',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification for demo request', error);
    }

    // Send email notification to admin
    try {
      await this.mailService.send({
        to: process.env.SMTP_FROM || process.env.SES_FROM || 'info@cortanasoft.com',
        subject: `Нова заявка за демо от ${dto.companyName || dto.name}`,
        html: `
          <h2>Нова заявка за демо</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:6px 12px;font-weight:bold;">Име:</td><td style="padding:6px 12px;">${dto.name}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${dto.email}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Телефон:</td><td style="padding:6px 12px;">${dto.phone || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Фирма:</td><td style="padding:6px 12px;">${dto.companyName || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Брой служители:</td><td style="padding:6px 12px;">${dto.employeeCount || '—'}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;">Съобщение:</td><td style="padding:6px 12px;">${dto.message || '—'}</td></tr>
          </table>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send admin email notification for demo request', error);
    }

    // Send confirmation email to the requester
    try {
      await this.mailService.send({
        to: dto.email,
        subject: 'Получихме вашата заявка за демо — CortanaSoft',
        html: this.buildConfirmationEmail(dto.name, dto.companyName),
      });
    } catch (error) {
      this.logger.error('Failed to send confirmation email to requester', error);
    }

    return demoRequest;
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
   * Get a single demo request by ID (admin only)
   */
  async findOne(id: string) {
    const demoRequest = await this.prisma.demoRequest.findUnique({
      where: { id },
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
    await this.findOne(id);

    return this.prisma.demoRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.contactedAt && { contactedAt: new Date(dto.contactedAt) }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.completedAt && { completedAt: new Date(dto.completedAt) }),
      },
    });
  }

  /**
   * Delete a demo request (admin only)
   */
  async remove(id: string) {
    await this.findOne(id);

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
                Благодарим ви, че проявихте интерес към <strong>CortanaSoft</strong>${companyName ? ` от името на <strong>${companyName}</strong>` : ''}. Получихме вашата заявка за демонстрация и екипът ни ще се свърже с вас в рамките на <strong>1 работен ден</strong>.
              </p>

              <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.7;">
                По време на демото ще ви покажем как платформата може да помогне за:
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:6px 0;color:#3f3f46;font-size:15px;">
                    <span style="display:inline-block;width:24px;text-align:center;color:#4f46e5;font-weight:bold;">&#10003;</span>
                    Управление на продажби, фактуриране и складови наличности
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#3f3f46;font-size:15px;">
                    <span style="display:inline-block;width:24px;text-align:center;color:#4f46e5;font-weight:bold;">&#10003;</span>
                    Проследяване на клиенти, сделки и комуникация
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#3f3f46;font-size:15px;">
                    <span style="display:inline-block;width:24px;text-align:center;color:#4f46e5;font-weight:bold;">&#10003;</span>
                    HR процеси — служители, отпуски, заплати, присъствие
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#3f3f46;font-size:15px;">
                    <span style="display:inline-block;width:24px;text-align:center;color:#4f46e5;font-weight:bold;">&#10003;</span>
                    Производство, складови операции и доставки с Еконт
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Ако имате въпроси междувременно, не се колебайте да ни пишете на
                <a href="mailto:info@cortanasoft.com" style="color:#4f46e5;text-decoration:none;font-weight:500;">info@cortanasoft.com</a>
                или да се обадите на <a href="tel:+359876649967" style="color:#4f46e5;text-decoration:none;font-weight:500;">+359 87 664 9967</a>.
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
