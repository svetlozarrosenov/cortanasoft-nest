import { ProductType } from '@prisma/client';
export declare class QueryProductsDto {
    search?: string;
    type?: ProductType;
    categoryId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
