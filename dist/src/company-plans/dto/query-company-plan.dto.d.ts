import { BillingCycle, CompanyPlanStatus } from '@prisma/client';
export declare class QueryCompanyPlanDto {
    search?: string;
    companyId?: string;
    status?: CompanyPlanStatus;
    billingCycle?: BillingCycle;
    autoInvoice?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
