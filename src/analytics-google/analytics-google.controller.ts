import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AnalyticsGoogleService } from './analytics-google.service';
import { SaveGoogleAnalyticsConfigDto } from './dto';

@Controller('admin/google-analytics')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AnalyticsGoogleController {
  constructor(private service: AnalyticsGoogleService) {}

  @Get('config')
  async getConfig() {
    const config = await this.service.getConfig();
    return { success: true, config };
  }

  @Put('config')
  async saveConfig(@Body() dto: SaveGoogleAnalyticsConfigDto) {
    const config = await this.service.saveConfig(dto);
    return { success: true, config };
  }

  @Delete('config')
  async deleteConfig() {
    return this.service.deleteConfig();
  }

  @Get('overview')
  async getOverview(@Query('days') days?: string) {
    const data = await this.service.getOverview(Number(days) || 30);
    return { success: true, data };
  }

  @Get('realtime')
  async getRealtime() {
    const data = await this.service.getRealtime();
    return { success: true, data };
  }
}
