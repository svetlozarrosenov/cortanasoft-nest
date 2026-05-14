import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CustomWebsiteService } from './custom-website.service';
import { SaveCustomWebsiteDto } from './dto/save-custom-website.dto';

// Admin endpoints for the per-company "Custom Website" integration —
// one row in Integration + IntegrationWebhook + ApiKey managed as a
// single logical entity. Super-admin only.
@Controller('admin/companies/:companyId/custom-website')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CustomWebsiteController {
  constructor(private service: CustomWebsiteService) {}

  @Get()
  async get(@Param('companyId') companyId: string) {
    const integration = await this.service.get(companyId);
    return { success: true, integration };
  }

  @Put()
  async save(@Param('companyId') companyId: string, @Body() dto: SaveCustomWebsiteDto) {
    const result = await this.service.save(companyId, dto);
    return { success: true, ...result };
  }

  @Delete()
  async remove(@Param('companyId') companyId: string) {
    await this.service.remove(companyId);
    return { success: true, message: 'Custom Website integration removed' };
  }

  @Post('regenerate-api-key')
  async regenerate(@Param('companyId') companyId: string) {
    const { rawKey } = await this.service.regenerateApiKey(companyId);
    return { success: true, rawKey };
  }

  @Post('pull/customers')
  async pullCustomers(@Param('companyId') companyId: string) {
    const result = await this.service.pullCustomers(companyId);
    return { success: true, ...result };
  }

  @Post('pull/categories')
  async pullCategories(@Param('companyId') companyId: string) {
    const result = await this.service.pullCategories(companyId);
    return { success: true, ...result };
  }

  @Post('pull/products')
  async pullProducts(@Param('companyId') companyId: string) {
    const result = await this.service.pullProducts(companyId);
    return { success: true, ...result };
  }
}
