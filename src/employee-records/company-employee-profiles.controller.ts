import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { EmployeeProfileService } from './employee-profile.service';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/employee-profiles')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmployeeProfilesController {
  constructor(private readonly service: EmployeeProfileService) {}

  @Get(':userId')
  @RequireView('employeeRecords', 'personalData')
  get(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.get(companyId, userId);
  }

  @Patch(':userId')
  @RequireEdit('employeeRecords', 'personalData')
  update(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateEmployeeProfileDto,
  ) {
    return this.service.update(companyId, userId, dto);
  }
}
