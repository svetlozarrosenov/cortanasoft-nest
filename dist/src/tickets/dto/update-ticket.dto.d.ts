import { TicketPriority, TicketStatus, TicketType } from './create-ticket.dto';
export declare class UpdateTicketDto {
    title?: string;
    description?: string;
    type?: TicketType;
    priority?: TicketPriority;
    status?: TicketStatus;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    assigneeId?: string;
    parentId?: string;
    tags?: string;
}
