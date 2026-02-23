export declare class CreatePurchaseOrderItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
}
export declare class CreatePurchaseOrderDto {
    orderNumber?: string;
    orderDate?: string;
    expectedDate?: string;
    supplierId: string;
    notes?: string;
    items: CreatePurchaseOrderItemDto[];
}
