import { PaymentMethod } from '@prisma/client';
export declare class CreateProformaItemDto {
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
}
export declare class CreateProformaDto {
    customerId?: string;
    customerName: string;
    customerEik?: string;
    customerVatNumber?: string;
    customerAddress?: string;
    customerCity?: string;
    customerPostalCode?: string;
    invoiceDate?: string;
    dueDate?: string;
    paymentMethod?: PaymentMethod;
    discount?: number;
    notes?: string;
    currencyId?: string;
    items: CreateProformaItemDto[];
}
