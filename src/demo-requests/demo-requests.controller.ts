import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { DemoRequestsService } from './demo-requests.service';
import { MailService } from '../mail/mail.service';
import { CreateDemoRequestDto } from './dto';

class ContactFormDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MaxLength(50)
  subject: string;

  @IsString()
  @MaxLength(2000)
  message: string;
}

/**
 * Public controller for demo requests and contact form (no auth required)
 */
@Controller('demo-requests')
export class DemoRequestsController {
  constructor(
    private demoRequestsService: DemoRequestsService,
    private mailService: MailService,
  ) {}

  /**
   * Create a new demo request from the public website
   * POST /api/demo-requests
   */
  @Post()
  async create(
    @Headers('x-internal-key') internalKey: string,
    @Body() dto: CreateDemoRequestDto,
  ) {
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (expectedKey && internalKey !== expectedKey) {
      throw new ForbiddenException('Невалидна заявка');
    }

    const demoRequest = await this.demoRequestsService.create(dto);
    return {
      success: true,
      message: 'Заявката е изпратена успешно. Ще се свържем с вас скоро!',
      demoRequest: {
        id: demoRequest.id,
        name: demoRequest.name,
        email: demoRequest.email,
      },
    };
  }

  /**
   * Handle contact form submission
   * POST /api/demo-requests/contact
   */
  @Post('contact')
  async contact(@Body() dto: ContactFormDto) {
    const subjectLabels: Record<string, string> = {
      sales: 'Запитване за продажби',
      demo: 'Заявка за демонстрация',
      support: 'Техническа поддръжка',
      partnership: 'Партньорство',
      other: 'Друго',
    };

    await this.mailService.send({
      to: process.env.SMTP_FROM || process.env.SES_FROM || 'info@cortanasoft.com',
      subject: `Контактна форма: ${subjectLabels[dto.subject] || dto.subject} — ${dto.name}`,
      html: `
        <h2>Ново запитване от контактната форма</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td style="padding:6px 12px;font-weight:bold;">Име:</td><td style="padding:6px 12px;">${dto.name}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${dto.email}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Компания:</td><td style="padding:6px 12px;">${dto.company || '—'}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Телефон:</td><td style="padding:6px 12px;">${dto.phone || '—'}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Относно:</td><td style="padding:6px 12px;">${subjectLabels[dto.subject] || dto.subject}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Съобщение:</td><td style="padding:6px 12px;">${dto.message}</td></tr>
        </table>
      `,
    });

    return {
      success: true,
      message: 'Съобщението е изпратено успешно!',
    };
  }
}
