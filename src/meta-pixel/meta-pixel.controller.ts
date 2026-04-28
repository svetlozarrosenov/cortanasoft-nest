import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { MetaPixelService } from './meta-pixel.service';
import { SaveMetaPixelConfigDto } from './dto';

@Controller('admin/meta-pixel')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MetaPixelController {
  constructor(private service: MetaPixelService) {}

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
}
