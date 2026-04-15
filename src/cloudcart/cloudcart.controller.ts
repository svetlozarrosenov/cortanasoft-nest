import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CloudCartService } from './cloudcart.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SaveCloudCartIntegrationDto } from './dto';

@Controller('admin/companies/:companyId/cloudcart')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CloudCartController {
  constructor(private cloudCartService: CloudCartService) {}

  // ==================== Интеграция ====================

  @Get()
  async getIntegration(@Param('companyId') companyId: string) {
    const integration = await this.cloudCartService.getIntegration(companyId);
    const webhookKey = await this.cloudCartService.getWebhookKey(companyId);
    return { success: true, integration, webhookKey };
  }

  @Put()
  async saveIntegration(
    @Param('companyId') companyId: string,
    @Body() dto: SaveCloudCartIntegrationDto,
  ) {
    const integration = await this.cloudCartService.saveIntegration(
      companyId,
      dto,
    );
    return {
      success: true,
      integration: {
        ...integration,
        apiKey: '••••••••',
      },
    };
  }

  @Delete()
  async deleteIntegration(@Param('companyId') companyId: string) {
    await this.cloudCartService.deleteIntegration(companyId);
    return { success: true, message: 'CloudCart интеграцията е премахната' };
  }

  // ==================== Webhook Key ====================

  @Post('regenerate-webhook-key')
  async regenerateWebhookKey(@Param('companyId') companyId: string) {
    const integration = await this.cloudCartService.regenerateWebhookKey(companyId);
    const settings = integration.settings as Record<string, unknown> | null;
    return { success: true, webhookKey: settings?.webhookKey };
  }

  // ==================== Тест на връзката ====================

  @Post('test-connection')
  async testConnection(@Param('companyId') companyId: string) {
    const result = await this.cloudCartService.testConnection(companyId);
    return { success: true, connected: result.success };
  }

  // ==================== Pull от CloudCart ====================

  @Post('pull-categories')
  async pullCategories(@Param('companyId') companyId: string) {
    const result = await this.cloudCartService.pullCategories(companyId);
    return { success: true, ...result };
  }

  @Post('pull-products')
  async pullProducts(@Param('companyId') companyId: string) {
    const result = await this.cloudCartService.pullProducts(companyId);
    return { success: true, ...result };
  }
}
