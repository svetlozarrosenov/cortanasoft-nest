export declare class CreateGoodsReceiptItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    currencyId?: string;
    exchangeRate?: number;
    purchaseOrderItemId?: string;
}
export declare class CreateGoodsReceiptDto {
    receiptNumber?: string;
    receiptDate?: string;
    locationId: string;
    supplierId?: string;
    purchaseOrderId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    notes?: string;
    currencyId?: string;
    exchangeRate?: number;
    attachmentUrl?: string;
    items: CreateGoodsReceiptItemDto[];
}
