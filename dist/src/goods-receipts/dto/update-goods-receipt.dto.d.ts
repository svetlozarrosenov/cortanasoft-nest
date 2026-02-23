import { GoodsReceiptStatus } from '@prisma/client';
export declare class UpdateGoodsReceiptDto {
    receiptDate?: string;
    locationId?: string;
    supplierId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    notes?: string;
    currencyId?: string;
    exchangeRate?: number;
    attachmentUrl?: string;
    status?: GoodsReceiptStatus;
}
