import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireEdit,
} from '../common/guards/permissions.guard';

// Настройки > AI — само роли с изричното право settings.ai виждат и пипат
// ключа (маскиран изглед; plain text никога не се връща).
@Controller('companies/:companyId/ai-settings')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyAiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  @RequireView('settings', 'ai')
  getSettings(@Param('companyId') companyId: string) {
    return this.aiSettingsService.getSettings(companyId);
  }

  @Put()
  @RequireEdit('settings', 'ai')
  updateSettings(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.aiSettingsService.updateSettings(companyId, dto);
  }

  // Тестът също удря Anthropic с ключа на клиента — също лимитиран
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @RequireEdit('settings', 'ai')
  testConnection(@Param('companyId') companyId: string) {
    return this.aiSettingsService.testConnection(companyId);
  }
}
