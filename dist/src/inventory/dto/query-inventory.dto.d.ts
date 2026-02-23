export declare class QueryInventoryDto {
    search?: string;
    productId?: string;
    locationId?: string;
    storageZoneId?: string;
    goodsReceiptId?: string;
    expiryDateFrom?: string;
    expiryDateTo?: string;
    hasStock?: boolean;
    expiringSoon?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class QueryStockLevelsDto {
    search?: string;
    locationId?: string;
    categoryId?: string;
    hasStock?: boolean;
    belowMinStock?: boolean;
    page?: number;
    limit?: number;
}
