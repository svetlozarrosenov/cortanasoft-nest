import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/reports')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('partners')
  @RequireView('bi', 'partners')
  partnersReport(
    @Param('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.partnersReport(companyId, { from, to });
  }
}
