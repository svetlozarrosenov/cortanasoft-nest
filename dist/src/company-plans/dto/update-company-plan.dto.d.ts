import { BillingCycle, CompanyPlanStatus } from '@prisma/client';
export declare class UpdateCompanyPlanItemDto {
    id?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    vatRate?: number;
    productId?: string;
    sortOrder?: number;
}
export declare class UpdateCompanyPlanDto {
    name?: string;
    description?: string;
    amount?: number;
    currencyId?: string;
    billingCycle?: BillingCycle;
    billingDayOfMonth?: number;
    startDate?: string;
    endDate?: string;
    invoiceNotes?: string;
    status?: CompanyPlanStatus;
    autoInvoice?: boolean;
    items?: UpdateCompanyPlanItemDto[];
}
