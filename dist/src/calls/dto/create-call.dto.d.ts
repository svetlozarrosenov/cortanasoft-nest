import { CallDirection, CallOutcome } from '@prisma/client';
export declare class CreateCallDto {
    subject: string;
    direction?: CallDirection;
    outcome?: CallOutcome;
    phoneNumber?: string;
    scheduledAt?: string;
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    notes?: string;
    followUpDate?: string;
    followUpNotes?: string;
    customerId?: string;
    contactId?: string;
    leadId?: string;
    dealId?: string;
    crmCompanyId?: string;
    assignedToId?: string;
}
