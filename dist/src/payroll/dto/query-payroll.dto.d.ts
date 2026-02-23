import { PayrollStatus } from '@prisma/client';
export declare class QueryPayrollDto {
    userId?: string;
    year?: number;
    month?: number;
    status?: PayrollStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
