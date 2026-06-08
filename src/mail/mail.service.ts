import { Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

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
    attachments?: MailAttachment[];
  }): Promise<void> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
    const from = options.from || this.from;
    const attachments = options.attachments;

    if (this.sesClient) {
      if (attachments && attachments.length > 0) {
        await this.sendRawViaSES(from, toAddresses, options.subject, options.html, attachments);
      } else {
        await this.sendViaSES(from, toAddresses, options.subject, options.html);
      }
    } else {
      await this.sendViaSMTP(from, toAddresses, options.subject, options.html, attachments);
    }
  }

  // SES has no attachment support on SendEmail — build a raw MIME message
  // (via nodemailer's composer) and send it with SendRawEmail.
  private async sendRawViaSES(
    from: string,
    to: string[],
    subject: string,
    html: string,
    attachments: MailAttachment[],
  ): Promise<void> {
    try {
      const raw = await new MailComposer({
        from,
        to: to.join(', '),
        subject,
        html,
        attachments,
      })
        .compile()
        .build();
      const result = await this.sesClient!.send(
        new SendRawEmailCommand({ RawMessage: { Data: raw } }),
      );
      this.logger.log(`Email (with ${attachments.length} attachment(s)) sent via SES to ${to.join(', ')} (messageId: ${result.MessageId})`);
    } catch (error) {
      this.logger.error(`Failed to send raw email via SES to ${to.join(', ')}`, error);
      throw error;
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
    attachments?: MailAttachment[],
  ): Promise<void> {
    try {
      const info = await this.transporter!.sendMail({
        from,
        to: to.join(', '),
        subject,
        html,
        attachments,
      });
      this.logger.log(`Email sent via SMTP to ${to.join(', ')} (messageId: ${info.messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send email via SMTP to ${to.join(', ')}`, error);
      throw error;
    }
  }
}
