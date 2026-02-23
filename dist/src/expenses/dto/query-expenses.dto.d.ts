import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
export declare class QueryExpensesDto {
    search?: string;
    category?: ExpenseCategory;
    status?: ExpenseStatus;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
