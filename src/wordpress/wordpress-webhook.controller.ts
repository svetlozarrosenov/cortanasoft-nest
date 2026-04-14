import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { WordPressWebhookService } from './wordpress-webhook.service';

@Controller('wordpress/webhooks')
export class WordPressWebhookController {
  private readonly logger = new Logger(WordPressWebhookController.name);

  constructor(private webhookService: WordPressWebhookService) {}

  @Get('ping')
  async ping(@Headers('x-api-key') apiKey: string | undefined) {
    const companyId = await this.webhookService.resolveCompanyByApiKey(apiKey);
    if (!companyId) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return { success: true, message: 'pong' };
  }

  @Post('order')
  @HttpCode(200)
  async handleOrderWebhook(
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    const items = payload?.items;
    if (!items || !Array.isArray(items)) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const companyId = await this.webhookService.resolveCompanyByApiKey(apiKey);
    if (!companyId) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    const order = payload.order as
      | { orderNumber?: string; externalId?: string | number }
      | undefined;
    const orderRef = String(
      order?.orderNumber || order?.externalId || 'unknown',
    );
    this.logger.log(
      `WooCommerce order webhook received: #${orderRef} (company: ${companyId})`,
    );

    const result = await this.webhookService.processOrderWebhook(
      companyId,
      payload as unknown as Parameters<typeof this.webhookService.processOrderWebhook>[1],
    );

    return {
      success: true,
      ...result,
    };
  }
}
