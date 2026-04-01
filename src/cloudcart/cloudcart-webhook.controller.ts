import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { CloudCartWebhookService } from './cloudcart-webhook.service';

@Controller('cloudcart/webhooks')
export class CloudCartWebhookController {
  private readonly logger = new Logger(CloudCartWebhookController.name);

  constructor(private webhookService: CloudCartWebhookService) {}

  @Post('order')
  @HttpCode(200)
  async handleOrderWebhook(
    @Headers('x-cloudcart-apikey') apiKey: string | undefined,
    @Body() payload: any,
  ) {
    if (!payload || !payload.id) {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Намираме компанията по API ключа от Integration таблицата
    const companyId = await this.webhookService.resolveCompanyByApiKey(apiKey);
    if (!companyId) {
      throw new UnauthorizedException('Invalid or missing CloudCart API key');
    }

    this.logger.log(
      `CloudCart order webhook received: #${payload.id} (company: ${companyId})`,
    );

    const result = await this.webhookService.processOrderWebhook(
      companyId,
      payload,
    );

    return {
      success: true,
      ...result,
    };
  }
}
