import { PrismaService } from '../prisma/prisma.service';
import { QueryProfitAnalyticsDto } from './dto';
import { ExpensesService } from '../expenses/expenses.service';
export interface ProductProfitData {
    productId: string;
    productName: string;
    productSku: string;
    categoryName: string | null;
    unitsSold: number;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
    avgSellingPrice: number;
    avgCostPrice: number;
}
export interface CategoryProfitData {
    categoryId: string | null;
    categoryName: string;
    revenue: number;
    cost: number;
    profit: number;
    profitMargin: number;
}
export interface PeriodComparison {
    previousRevenue: number;
    previousCost: number;
    previousProfit: number;
    revenueGrowth: number;
    profitGrowth: number;
}
export interface ProfitAnalyticsResult {
    summary: {
        totalRevenue: number;
        totalCost: number;
        grossProfit: number;
        profitMargin: number;
        orderCount: number;
        itemsSold: number;
    };
    byProduct: ProductProfitData[];
    byCategory: CategoryProfitData[];
    periodComparison?: PeriodComparison;
}
export interface ProductPurchaseData {
    productId: string;
    productName: string;
    productSku: string;
    categoryName: string | null;
    unitsPurchased: number;
    totalCost: number;
    avgCostPrice: number;
}
export interface SupplierPurchaseData {
    supplierId: string | null;
    supplierName: string;
    totalCost: number;
    receiptCount: number;
}
export interface PurchaseSummaryResult {
    summary: {
        totalPurchaseCost: number;
        totalUnitsPurchased: number;
        receiptCount: number;
    };
    byProduct: ProductPurchaseData[];
    bySupplier: SupplierPurchaseData[];
}
export interface ExpenseCategoryData {
    category: string;
    amount: number;
}
export interface ExpensesSummary {
    totalExpenses: number;
    expenseCount: number;
    byCategory: ExpenseCategoryData[];
}
export interface PayrollSummary {
    totalSalaries: number;
    totalInsurance: number;
    employeeCount: number;
}
export interface FinancialSummaryResult {
    revenue: number;
    orderCount: number;
    itemsSold: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMargin: number;
    expenses: ExpensesSummary;
    payroll: PayrollSummary;
    totalOperatingExpenses: number;
    netProfit: number;
    netMargin: number;
    totalPurchases: number;
    itemsPurchased: number;
    periodComparison?: PeriodComparison;
    topProducts: ProductProfitData[];
    topCategories: CategoryProfitData[];
    topSuppliers: SupplierPurchaseData[];
}
export declare class ErpAnalyticsService {
    private prisma;
    private expensesService;
    constructor(prisma: PrismaService, expensesService: ExpensesService);
    getProfitAnalytics(companyId: string, query: QueryProfitAnalyticsDto): Promise<ProfitAnalyticsResult>;
    getPurchaseSummary(companyId: string, query: QueryProfitAnalyticsDto): Promise<PurchaseSummaryResult>;
    private getPayrollSummary;
    getFinancialSummary(companyId: string, query: QueryProfitAnalyticsDto): Promise<FinancialSummaryResult>;
}
