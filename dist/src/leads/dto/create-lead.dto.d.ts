import { LeadStatus, LeadSource } from '@prisma/client';
export declare class CreateLeadDto {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    mobile?: string;
    companyName?: string;
    jobTitle?: string;
    status?: LeadStatus;
    source?: LeadSource;
    sourceDetails?: string;
    score?: number;
    priority?: string;
    interest?: string;
    budget?: number;
    address?: string;
    city?: string;
    countryId?: string;
    description?: string;
    notes?: string;
    nextFollowUp?: string;
    assignedToId?: string;
}
