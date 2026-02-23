import { PaymentMethod } from '@prisma/client';
export declare class CreateOrderItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    discount?: number;
    inventoryBatchId?: string;
}
export declare class CreateOrderDto {
    orderNumber?: string;
    orderDate?: string;
    customerId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
    paymentMethod?: PaymentMethod;
    locationId?: string;
    shippingCost?: number;
    discount?: number;
    notes?: string;
    currencyId?: string;
    items: CreateOrderItemDto[];
}
