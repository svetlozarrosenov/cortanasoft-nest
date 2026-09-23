import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { ErpAnalyticsService } from './erp-analytics.service';
import type { SalesGroupBy } from './erp-analytics.service';
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
  CustomerReceivableOrder,
  ProductsReportResult,
} from './erp-analytics.service';

@Controller('companies/:companyId/erp-analytics')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ErpAnalyticsController {
  constructor(
    private readonly analyticsService: ErpAnalyticsService,
    private readonly exportService: ExportService,
  ) {}

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

  // Експорт на групираната таблица (по продукт / клиент / месец / обект)
  @Get('sales/export')
  @RequireView('bi', 'sales')
  async exportSalesReport(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
    @Query('groupBy') groupBy: SalesGroupBy = 'product',
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.analyticsService.getSalesReport(companyId, query);
    const rows =
      groupBy === 'customer' ? report.byCustomer
      : groupBy === 'month' ? report.byMonth
      : groupBy === 'site' ? report.bySite
      : report.byProduct;
    const columns = [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Code', key: 'sub', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Orders', key: 'orderCount', width: 10 },
      { header: 'Revenue (net)', key: 'revenue', width: 16 },
      { header: 'Cost', key: 'cost', width: 16 },
      { header: 'Gross profit', key: 'profit', width: 16 },
      { header: 'Margin %', key: 'margin', width: 12 },
    ];
    const buffer = await this.exportService.generateFile(columns, rows, format, 'Sales');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="sales-${groupBy}-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  // Приходи и разходи (P&L) — отделна страница в Отчети
  @Get('profit-loss')
  @RequireView('bi', 'profitLoss')
  async getProfitLoss(
    @Param('companyId') companyId: string,
    @Query() query: QueryProfitAnalyticsDto,
  ): Promise<FinancialSummaryResult> {
    return this.analyticsService.getFinancialSummary(companyId, query);
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

  @Get('customers/:customerId/receivables')
  @RequireView('bi', 'customers')
  async getCustomerReceivableOrders(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ): Promise<CustomerReceivableOrder[]> {
    return this.analyticsService.getCustomerReceivableOrders(
      companyId,
      customerId,
    );
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
