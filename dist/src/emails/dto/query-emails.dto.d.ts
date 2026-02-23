import { EmailDirection, EmailStatus, EmailPriority } from '@prisma/client';
export declare class QueryEmailsDto {
    search?: string;
    direction?: EmailDirection;
    status?: EmailStatus;
    priority?: EmailPriority;
    customerId?: string;
    contactId?: string;
    leadId?: string;
    dealId?: string;
    crmCompanyId?: string;
    assignedToId?: string;
    threadId?: string;
    dateFrom?: string;
    dateTo?: string;
    scheduled?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
