import { Controller, Get, UseGuards, Param, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { DashboardService } from './dashboard.service';

@Controller('companies/:companyId/dashboard')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Param('companyId') companyId: string, @Request() req: any) {
    return this.dashboardService.getDashboardStats(companyId, req.user.id);
  }

  @Get('activity')
  async getActivity(@Param('companyId') companyId: string) {
    return this.dashboardService.getRecentActivity(companyId);
  }
}
