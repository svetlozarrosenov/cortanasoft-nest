import { EmailDirection, EmailPriority } from '@prisma/client';
export declare class CreateEmailDto {
    subject: string;
    body?: string;
    bodyText?: string;
    direction?: EmailDirection;
    priority?: EmailPriority;
    fromEmail: string;
    fromName?: string;
    toEmail: string;
    toName?: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    scheduledAt?: string;
    attachments?: {
        name: string;
        url: string;
        size: number;
        mimeType: string;
    }[];
    threadId?: string;
    inReplyTo?: string;
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
