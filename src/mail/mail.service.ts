import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly ses: SESClient;
  private readonly from: string;

  constructor() {
    this.ses = new SESClient({
      region: process.env.SES_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
      },
    });
    this.from = process.env.SES_FROM || 'info@cortanasoft.com';
  }

  async send(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    try {
      await this.ses.send(
        new SendEmailCommand({
          Source: options.from || this.from,
          Destination: {
            ToAddresses: toAddresses,
          },
          Message: {
            Subject: { Data: options.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: options.html, Charset: 'UTF-8' },
            },
          },
        }),
      );
      this.logger.log(`Email sent to ${toAddresses.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${toAddresses.join(', ')}`, error);
      throw error;
    }
  }
}
