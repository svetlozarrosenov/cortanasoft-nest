import { LeadStatus, LeadSource } from '@prisma/client';
export declare class QueryLeadsDto {
    search?: string;
    status?: LeadStatus;
    source?: LeadSource;
    assignedToId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
