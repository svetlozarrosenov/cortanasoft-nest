import { OrderStatus, PaymentStatus } from '@prisma/client';
export declare class QueryOrdersDto {
    search?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
