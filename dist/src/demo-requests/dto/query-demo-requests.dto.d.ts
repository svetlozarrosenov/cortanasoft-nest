import { DemoRequestStatus } from '@prisma/client';
export declare class QueryDemoRequestsDto {
    search?: string;
    status?: DemoRequestStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
