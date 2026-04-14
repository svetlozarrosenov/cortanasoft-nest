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
import { WordPressService } from './wordpress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { SaveWordPressIntegrationDto } from './dto';

@Controller('admin/companies/:companyId/wordpress')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class WordPressController {
  constructor(private wordPressService: WordPressService) {}

  @Get()
  async getIntegration(@Param('companyId') companyId: string) {
    const integration =
      await this.wordPressService.getIntegration(companyId);
    return { success: true, integration };
  }

  @Put()
  async saveIntegration(
    @Param('companyId') companyId: string,
    @Body() dto: SaveWordPressIntegrationDto,
  ) {
    const integration = await this.wordPressService.saveIntegration(
      companyId,
      dto,
    );
    return { success: true, integration };
  }

  @Post('regenerate-key')
  async regenerateApiKey(@Param('companyId') companyId: string) {
    const integration =
      await this.wordPressService.regenerateApiKey(companyId);
    return { success: true, integration };
  }

  @Delete()
  async deleteIntegration(@Param('companyId') companyId: string) {
    await this.wordPressService.deleteIntegration(companyId);
    return { success: true, message: 'WordPress интеграцията е премахната' };
  }

  @Post('test-connection')
  async testConnection(@Param('companyId') companyId: string) {
    const result = await this.wordPressService.testConnection(companyId);
    return { success: true, connected: result.success };
  }
}
