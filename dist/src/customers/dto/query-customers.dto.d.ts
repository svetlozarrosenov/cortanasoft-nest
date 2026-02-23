import { CustomerType, CustomerStage, CustomerSource } from '@prisma/client';
export declare class QueryCustomersDto {
    search?: string;
    type?: CustomerType;
    isActive?: boolean;
    stage?: CustomerStage;
    source?: CustomerSource;
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
