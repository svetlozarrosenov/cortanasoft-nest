import { PurchaseOrderStatus } from '@prisma/client';
export declare class QueryPurchaseOrdersDto {
    search?: string;
    status?: PurchaseOrderStatus;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
