import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ErpAnalyticsService } from './erp-analytics.service';
import { QueryProfitAnalyticsDto, QueryCustomerReceivablesDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { PermissionsGuard, RequireView } from '../common/guards/permissions.guard';
import {
  ProfitAnalyticsResult,
  FinancialSummaryResult,
  SalesReportResult,
  CustomersReportResult,
  CustomerReceivablesResult,
  ProductsReportResult,
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

  @Get('financial-summary')
  @RequireView('bi', 'sales')
  async getFinancialSummary(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<FinancialSummaryResult> {
    return this.analyticsService.getFinancialSummary(companyId, query);
  }

  @Get('sales')
  @RequireView('bi', 'sales')
  async getSalesReport(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<SalesReportResult> {
    return this.analyticsService.getSalesReport(companyId, query);
  }

  @Get('customers')
  @RequireView('bi', 'customers')
  async getCustomersReport(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<CustomersReportResult> {
    return this.analyticsService.getCustomersReport(companyId, query);
  }

  // Задължения на клиенти (към момента) — част от отчета „Клиенти"
  @Get('customers/receivables')
  @RequireView('bi', 'customers')
  async getCustomerReceivables(
    @Param('companyId') companyId: string,
    @Query() query: QueryCustomerReceivablesDto,
  ): Promise<CustomerReceivablesResult> {
    return this.analyticsService.getCustomerReceivables(companyId, query);
  }

  @Get('products')
  @RequireView('bi', 'products')
  async getProductsReport(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<ProductsReportResult> {
    return this.analyticsService.getProductsReport(companyId, query);
  }
}
