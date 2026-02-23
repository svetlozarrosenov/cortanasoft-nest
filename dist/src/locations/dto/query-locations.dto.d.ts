import { LocationType } from '@prisma/client';
export declare class QueryLocationsDto {
    search?: string;
    type?: LocationType;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
