import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly sesClient: SESClient | null;
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor() {
    const fromAddress = process.env.SMTP_FROM || process.env.SES_FROM || 'info@cortanasoft.com';
    this.from = `CortanaSoft <${fromAddress}>`;

    // Prefer SES API (HTTPS port 443, never blocked) over SMTP
    if (process.env.SES_ACCESS_KEY_ID && process.env.SES_SECRET_ACCESS_KEY) {
      this.sesClient = new SESClient({
        region: process.env.SES_REGION || 'eu-central-1',
        credentials: {
          accessKeyId: process.env.SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
        },
      });
      this.transporter = null;
      this.logger.log('Mail service initialized with AWS SES API');
    } else {
      this.sesClient = null;
      const port = Number(process.env.SMTP_PORT) || 587;
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'email-smtp.eu-central-1.amazonaws.com',
        port,
        secure: port === 465 || port === 2465, // TLS Wrapper ports; 587/2587 use STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log(`Mail service initialized with SMTP (port ${port})`);
    }
  }

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
    const from = options.from || this.from;

    if (this.sesClient) {
      await this.sendViaSES(from, toAddresses, options.subject, options.html);
    } else {
      await this.sendViaSMTP(from, toAddresses, options.subject, options.html);
    }
  }

  private async sendViaSES(
    from: string,
    to: string[],
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: to },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' } },
        },
      });
      const result = await this.sesClient!.send(command);
      this.logger.log(`Email sent via SES to ${to.join(', ')} (messageId: ${result.MessageId})`);
    } catch (error) {
      this.logger.error(`Failed to send email via SES to ${to.join(', ')}`, error);
      throw error;
    }
  }

  private async sendViaSMTP(
    from: string,
    to: string[],
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      const info = await this.transporter!.sendMail({
        from,
        to: to.join(', '),
        subject,
        html,
      });
      this.logger.log(`Email sent via SMTP to ${to.join(', ')} (messageId: ${info.messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send email via SMTP to ${to.join(', ')}`, error);
      throw error;
    }
  }
}
