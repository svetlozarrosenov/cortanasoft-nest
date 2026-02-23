import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto, CreateCommentDto, CreateReminderDto } from './dto';
export declare class CompanyTicketsController {
    private readonly ticketsService;
    constructor(ticketsService: TicketsService);
    create(companyId: string, req: any, dto: CreateTicketDto): Promise<{
        _count: {
            comments: number;
            subtasks: number;
        };
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    findAll(companyId: string, req: any, query: QueryTicketDto): Promise<{
        data: ({
            _count: {
                comments: number;
                subtasks: number;
            };
            createdBy: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            };
            assignee: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.TicketType;
            status: import(".prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            description: string | null;
            dueDate: Date | null;
            ticketNumber: string;
            priority: import(".prisma/client").$Enums.TicketPriority;
            updatedAt: Date;
            id: string;
            companyId: string;
            createdById: string;
            parentId: string | null;
            tags: string | null;
            title: string;
            completedAt: Date | null;
            startedAt: Date | null;
            estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
            actualHours: import("@prisma/client/runtime/library").Decimal | null;
            assigneeId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getSummary(companyId: string, req: any): Promise<{
        total: number;
        myAssigned: number;
        myCreated: number;
        byStatus: {
            todo: number;
            inProgress: number;
            inReview: number;
            done: number;
        };
        overdue: number;
        urgent: number;
    }>;
    findOne(companyId: string, id: string): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        parent: {
            ticketNumber: string;
            id: string;
            title: string;
        } | null;
        comments: ({
            author: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            id: string;
            content: string;
            ticketId: string;
            authorId: string;
        })[];
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        subtasks: {
            status: import(".prisma/client").$Enums.TicketStatus;
            ticketNumber: string;
            priority: import(".prisma/client").$Enums.TicketPriority;
            id: string;
            title: string;
            assignee: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        }[];
        reminders: {
            createdAt: Date;
            updatedAt: Date;
            id: string;
            userId: string;
            isSent: boolean;
            remindAt: Date;
            ticketId: string;
            message: string | null;
            sentAt: Date | null;
            recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
            intervalDays: number | null;
            recurrenceEnd: Date | null;
            recurrenceCount: number | null;
            sentCount: number;
        }[];
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateTicketDto): Promise<{
        _count: {
            comments: number;
            subtasks: number;
        };
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
    }>;
    startProgress(companyId: string, id: string): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    submitForReview(companyId: string, id: string): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    complete(companyId: string, id: string): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    cancel(companyId: string, id: string): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    assignToMe(companyId: string, id: string, req: any): Promise<{
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.TicketType;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdAt: Date;
        description: string | null;
        dueDate: Date | null;
        ticketNumber: string;
        priority: import(".prisma/client").$Enums.TicketPriority;
        updatedAt: Date;
        id: string;
        companyId: string;
        createdById: string;
        parentId: string | null;
        tags: string | null;
        title: string;
        completedAt: Date | null;
        startedAt: Date | null;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    addComment(companyId: string, ticketId: string, req: any, dto: CreateCommentDto): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        content: string;
        ticketId: string;
        authorId: string;
    }>;
    getComments(companyId: string, ticketId: string): Promise<({
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        content: string;
        ticketId: string;
        authorId: string;
    })[]>;
    deleteComment(companyId: string, ticketId: string, commentId: string): Promise<{
        success: boolean;
    }>;
    addReminder(companyId: string, ticketId: string, req: any, dto: CreateReminderDto): Promise<{
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        message: string | null;
        sentAt: Date | null;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    }>;
    getReminders(companyId: string, ticketId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        message: string | null;
        sentAt: Date | null;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    }[]>;
    deleteReminder(companyId: string, ticketId: string, reminderId: string): Promise<{
        success: boolean;
    }>;
}
