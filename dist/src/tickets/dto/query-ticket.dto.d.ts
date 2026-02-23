import { TicketPriority, TicketStatus, TicketType } from './create-ticket.dto';
export declare class QueryTicketDto {
    search?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    type?: TicketType;
    assigneeId?: string;
    createdById?: string;
    myTickets?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
