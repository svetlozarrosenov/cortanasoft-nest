import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { MetaPixelService } from './meta-pixel.service';
import { MetaPixelInsightsService } from './meta-pixel-insights.service';
import { SaveMetaPixelConfigDto } from './dto';

@Controller('admin/meta-pixel')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MetaPixelController {
  constructor(
    private service: MetaPixelService,
    private insights: MetaPixelInsightsService,
  ) {}

  @Get('config')
  async getConfig() {
    const config = await this.service.getConfig();
    return { success: true, config };
  }

  @Put('config')
  async saveConfig(@Body() dto: SaveMetaPixelConfigDto) {
    const config = await this.service.saveConfig(dto);
    return { success: true, config };
  }

  @Delete('config')
  async deleteConfig() {
    return this.service.deleteConfig();
  }

  // Pixel events analytics — Live fetch с 10 min cache в самия service.
  @Get('insights/overview')
  async getInsightsOverview(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const safeDays = Math.max(1, Math.min(90, days));
    const overview = await this.insights.getOverview(safeDays);
    return { success: true, overview };
  }

  // Force-refresh за случаи когато искаме да зачистим cache-а ръчно (рядко).
  @Post('insights/refresh')
  async refreshInsights() {
    this.insights.clearCache();
    return { success: true };
  }
}
