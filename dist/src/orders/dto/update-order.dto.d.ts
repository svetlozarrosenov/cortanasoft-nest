import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
export declare class UpdateOrderDto {
    orderDate?: string;
    status?: OrderStatus;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    locationId?: string;
    shippingCost?: number;
    discount?: number;
    notes?: string;
}
