import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { HrSettingsService } from './hr-settings.service';
import { UpdateHrSettingsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireAnyPermission,
  RequireEdit,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/hr-settings')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyHrSettingsController {
  constructor(private readonly hrSettingsService: HrSettingsService) {}

  // Четене: всеки с достъп до HR страница, която ползва дефолтите
  @Get()
  @RequireAnyPermission(
    { module: 'hr', page: 'settings', action: 'view' },
    { module: 'hr', page: 'attendance', action: 'view' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
    { module: 'hr', page: 'employees', action: 'view' },
    { module: 'hr', page: 'positions', action: 'view' },
    { module: 'hr', page: 'payroll', action: 'view' },
  )
  get(@Param('companyId') companyId: string) {
    return this.hrSettingsService.get(companyId);
  }

  @Patch()
  @RequireEdit('hr', 'settings')
  update(@Param('companyId') companyId: string, @Body() dto: UpdateHrSettingsDto) {
    return this.hrSettingsService.update(companyId, dto);
  }
}
