import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    try {
      await this.mailer.sendMail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.from && { from: options.from }),
      });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }
}
