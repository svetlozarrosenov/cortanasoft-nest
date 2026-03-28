import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'email-smtp.eu-central-1.amazonaws.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.from = process.env.SMTP_FROM || process.env.SES_FROM || 'info@cortanasoft.com';
  }

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const info = await this.transporter.sendMail({
        from: options.from || this.from,
        to: toAddresses.join(', '),
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${toAddresses.join(', ')} (messageId: ${info.messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${toAddresses.join(', ')}`, error);
      throw error;
    }
  }
}
