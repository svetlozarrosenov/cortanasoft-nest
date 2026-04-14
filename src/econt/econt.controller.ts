import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EcontService } from './econt.service';
import { UpdateEcontConfigDto } from './dto/update-econt-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/shipping/econt')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class EcontController {
  constructor(private readonly econtService: EcontService) {}

  @Get('config')
  @RequireAnyPermission(
    { module: 'settings', page: 'econt', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getConfig(@Param('companyId') companyId: string) {
    return this.econtService.getConfig(companyId);
  }

  @Patch('config')
  @RequireEdit('settings', 'econt')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateEcontConfigDto,
  ) {
    return this.econtService.updateConfig(companyId, dto);
  }

  @Post('test-connection')
  @RequireEdit('settings', 'econt')
  testConnection(@Param('companyId') companyId: string) {
    return this.econtService.testConnection(companyId);
  }

  @Get('offices')
  @RequireAnyPermission(
    { module: 'settings', page: 'econt', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getOffices(@Param('companyId') companyId: string) {
    return this.econtService.getOffices(companyId);
  }

  @Get('client-profiles')
  @RequireAnyPermission(
    { module: 'settings', page: 'econt', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getClientProfiles(@Param('companyId') companyId: string) {
    return this.econtService.getClientProfiles(companyId);
  }
}
