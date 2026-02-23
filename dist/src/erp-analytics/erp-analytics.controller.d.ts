import { ErpAnalyticsService } from './erp-analytics.service';
import { QueryProfitAnalyticsDto } from './dto';
import { ProfitAnalyticsResult, PurchaseSummaryResult, FinancialSummaryResult } from './erp-analytics.service';
export declare class ErpAnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: ErpAnalyticsService);
    getProfitAnalytics(companyId: string, query: QueryProfitAnalyticsDto): Promise<ProfitAnalyticsResult>;
    getPurchaseSummary(companyId: string, query: QueryProfitAnalyticsDto): Promise<PurchaseSummaryResult>;
    getFinancialSummary(companyId: string, query: QueryProfitAnalyticsDto): Promise<FinancialSummaryResult>;
}
