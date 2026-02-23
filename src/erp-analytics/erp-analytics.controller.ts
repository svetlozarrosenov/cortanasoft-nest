import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ErpAnalyticsService } from './erp-analytics.service';
import { QueryProfitAnalyticsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { PermissionsGuard, RequireView } from '../common/guards/permissions.guard';
import {
  ProfitAnalyticsResult,
  PurchaseSummaryResult,
  FinancialSummaryResult,
} from './erp-analytics.service';

@Controller('companies/:companyId/erp-analytics')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ErpAnalyticsController {
  constructor(private readonly analyticsService: ErpAnalyticsService) {}

  @Get('profit')
  @RequireView('erp', 'analytics')
  async getProfitAnalytics(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<ProfitAnalyticsResult> {
    return this.analyticsService.getProfitAnalytics(companyId, query);
  }

  @Get('purchases')
  @RequireView('erp', 'analytics')
  async getPurchaseSummary(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<PurchaseSummaryResult> {
    return this.analyticsService.getPurchaseSummary(companyId, query);
  }

  @Get('financial-summary')
  @RequireView('erp', 'analytics')
  async getFinancialSummary(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<FinancialSummaryResult> {
    return this.analyticsService.getFinancialSummary(companyId, query);
  }
}
