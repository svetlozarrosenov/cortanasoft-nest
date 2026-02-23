import { InvoiceStatus } from '@prisma/client';
export declare class QueryInvoicesDto {
    search?: string;
    status?: InvoiceStatus;
    orderId?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
