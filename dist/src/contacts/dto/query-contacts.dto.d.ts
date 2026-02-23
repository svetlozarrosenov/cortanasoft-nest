export declare class QueryContactsDto {
    search?: string;
    customerId?: string;
    isActive?: boolean;
    isPrimary?: boolean;
    department?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
