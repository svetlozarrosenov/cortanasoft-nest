import { GoodsReceiptStatus } from '@prisma/client';
export declare class QueryGoodsReceiptsDto {
    search?: string;
    status?: GoodsReceiptStatus;
    locationId?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
