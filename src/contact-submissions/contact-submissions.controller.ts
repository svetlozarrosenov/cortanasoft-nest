import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ContactSubmissionsService } from './contact-submissions.service';
import { CreateContactSubmissionDto } from './dto';
import { MailService } from '../mail/mail.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public controller for contact submissions (no auth required)
 */
@Controller('contact-submissions')
export class ContactSubmissionsController {
  private readonly logger = new Logger(ContactSubmissionsController.name);

  constructor(
    private contactSubmissionsService: ContactSubmissionsService,
    private mailService: MailService,
    private pushNotificationsService: PushNotificationsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Create a new contact submission from the public website
   * POST /api/contact-submissions
   */
  @Post()
  async create(@Body() dto: CreateContactSubmissionDto) {
    const submission = await this.contactSubmissionsService.create(dto);

    // Fire-and-forget: send notifications without blocking the response
    this.sendNotifications(dto).catch((error) => {
      this.logger.error('Unexpected error in contact submission notifications', error);
    });

    return {
      success: true,
      message: 'Съобщението е изпратено успешно!',
      submission: {
        id: submission.id,
        name: submission.name,
        email: submission.email,
      },
    };
  }

  /**
   * Send all notifications for a new contact submission (runs in background)
   */
  private async sendNotifications(dto: CreateContactSubmissionDto) {
    const subjectLabels: Record<string, string> = {
      sales: 'Запитване за продажби',
      demo: 'Заявка за демонстрация',
      support: 'Техническа поддръжка',
      partnership: 'Партньорство',
      other: 'Друго',
    };

    const subjectLabel = subjectLabels[dto.subject] || dto.subject;

    // Push notification to super admins
    try {
      const ownerCompanyUsers = await this.prisma.userCompany.findMany({
        where: { company: { role: 'OWNER' } },
        select: { userId: true },
      });

      const adminUserIds = [...new Set(ownerCompanyUsers.map((uc) => uc.userId))];

      if (adminUserIds.length > 0) {
        await this.pushNotificationsService.sendToUsers(adminUserIds, {
          title: 'Ново запитване от контактна форма',
          body: `${dto.name} — ${subjectLabel}`,
          url: '/dashboard/admin/contact-submissions',
        });
      }
    } catch (error) {
      this.logger.error('Failed to send push notification for contact submission', error);
    }

    // Email notification to admin
    try {
      await this.mailService.send({
        to: process.env.SMTP_FROM || process.env.SES_FROM || 'info@cortanasoft.com',
        subject: `Контактна форма: ${subjectLabel} — ${dto.name}`,
        html: this.buildAdminNotificationEmail(dto, subjectLabel),
      });
    } catch (error) {
      this.logger.error('Failed to send admin email notification for contact submission', error);
    }

    // Confirmation email to the requester
    try {
      await this.mailService.send({
        to: dto.email,
        subject: 'CortanaSoft — Получихме Вашето запитване',
        html: this.buildConfirmationEmail(dto.name, subjectLabel),
      });
    } catch (error) {
      this.logger.error('Failed to send confirmation email for contact submission', error);
    }
  }

  private buildAdminNotificationEmail(dto: CreateContactSubmissionDto, subjectLabel: string): string {
    const now = new Date();
    const timeStr = now.toLocaleString('bg-BG', { timeZone: 'Europe/Sofia', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const rows = [
      { label: 'Име', value: dto.name },
      ...(dto.company ? [{ label: 'Компания', value: dto.company }] : []),
      { label: 'Email', value: dto.email, href: `mailto:${dto.email}` },
      ...(dto.phone ? [{ label: 'Телефон', value: dto.phone, href: `tel:${dto.phone}` }] : []),
      { label: 'Относно', value: subjectLabel },
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
            <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Ново запитване</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${subjectLabel}</h1>
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

          <!-- Message -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Съобщение</p>
              <div style="padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #f4f4f5;color:#18181b;font-size:15px;line-height:1.7;white-space:pre-wrap;">${dto.message}</div>
            </td>
          </tr>

          <!-- Actions -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="mailto:${dto.email}?subject=Re: ${encodeURIComponent(subjectLabel)}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Отговори
                    </a>
                  </td>
                  ${dto.phone ? `<td>
                    <a href="tel:${dto.phone}" style="display:inline-block;padding:12px 24px;background:#f4f4f5;color:#3f3f46;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Обади се
                    </a>
                  </td>` : ''}
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

  private buildConfirmationEmail(name: string, subjectLabel: string): string {
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
                Получихме Вашето запитване относно <strong>${subjectLabel}</strong>. Ще прегледаме съобщението Ви.
              </p>

              <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.7;font-weight:600;">
                Какво следва?
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">1</span>
                    Ще разгледаме Вашето запитване
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">2</span>
                    Ще се свържем с Вас
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#3f3f46;font-size:15px;line-height:1.6;">
                    <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;color:#ffffff;background:#4f46e5;border-radius:50%;font-size:13px;font-weight:700;vertical-align:middle;margin-right:8px;">3</span>
                    Ще предложим решение, съобразено с Вашите нужди
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Ако имате допълнителни въпроси &mdash; пишете ни на
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
