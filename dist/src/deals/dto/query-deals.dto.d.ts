import { DealStatus } from '@prisma/client';
export declare class QueryDealsDto {
    search?: string;
    status?: DealStatus;
    customerId?: string;
    assignedToId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
