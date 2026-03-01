import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('ping')
  ping() {
    return { success: true, message: 'pong' };
  }

  @Post('orders')
  @HttpCode(200)
  async createOrder(@Req() req: any, @Body() payload: any) {
    const companyId = req.apiKeyCompanyId;
    const result = await this.integrationsService.processOrder(
      companyId,
      payload,
    );
    return {
      success: true,
      ...result,
    };
  }
}
