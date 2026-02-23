import { CallDirection, CallOutcome } from '@prisma/client';
export declare class QueryCallsDto {
    search?: string;
    direction?: CallDirection;
    outcome?: CallOutcome;
    customerId?: string;
    contactId?: string;
    leadId?: string;
    dealId?: string;
    crmCompanyId?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
    scheduled?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
