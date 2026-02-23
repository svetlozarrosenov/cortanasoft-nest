import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto, CreateCommentDto, CreateReminderDto } from './dto';
export declare class TicketsService {
    private prisma;
    constructor(prisma: PrismaService);
    generateTicketNumber(companyId: string): Promise<string>;
    create(companyId: string, userId: string, dto: CreateTicketDto): Promise<{
        _count: {
            comments: number;
            subtasks: number;
        };
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    findAll(companyId: string, userId: string, query: QueryTicketDto): Promise<{
        data: ({
            _count: {
                comments: number;
                subtasks: number;
            };
            createdBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            assignee: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.TicketType;
            description: string | null;
            companyId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            createdById: string;
            dueDate: Date | null;
            parentId: string | null;
            tags: string | null;
            priority: import(".prisma/client").$Enums.TicketPriority;
            startedAt: Date | null;
            title: string;
            completedAt: Date | null;
            ticketNumber: string;
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
    findOne(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        parent: {
            id: string;
            title: string;
            ticketNumber: string;
        } | null;
        comments: ({
            author: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            ticketId: string;
            authorId: string;
        })[];
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        subtasks: {
            id: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            priority: import(".prisma/client").$Enums.TicketPriority;
            title: string;
            ticketNumber: string;
            assignee: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        }[];
        reminders: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            message: string | null;
            sentAt: Date | null;
            isSent: boolean;
            remindAt: Date;
            ticketId: string;
            recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
            intervalDays: number | null;
            recurrenceEnd: Date | null;
            recurrenceCount: number | null;
            sentCount: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
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
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
    }>;
    startProgress(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    submitForReview(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    complete(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    cancel(companyId: string, id: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    assignToMe(companyId: string, id: string, userId: string): Promise<{
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.TicketType;
        description: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        createdById: string;
        dueDate: Date | null;
        parentId: string | null;
        tags: string | null;
        priority: import(".prisma/client").$Enums.TicketPriority;
        startedAt: Date | null;
        title: string;
        completedAt: Date | null;
        ticketNumber: string;
        estimatedHours: import("@prisma/client/runtime/library").Decimal | null;
        actualHours: import("@prisma/client/runtime/library").Decimal | null;
        assigneeId: string | null;
    }>;
    addComment(companyId: string, ticketId: string, userId: string, dto: CreateCommentDto): Promise<{
        author: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        ticketId: string;
        authorId: string;
    })[]>;
    deleteComment(companyId: string, ticketId: string, commentId: string): Promise<{
        success: boolean;
    }>;
    addReminder(companyId: string, ticketId: string, userId: string, dto: CreateReminderDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        message: string | null;
        sentAt: Date | null;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    }>;
    getReminders(companyId: string, ticketId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        message: string | null;
        sentAt: Date | null;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    }[]>;
    deleteReminder(companyId: string, ticketId: string, reminderId: string): Promise<{
        success: boolean;
    }>;
    getMyReminders(userId: string): Promise<({
        ticket: {
            id: string;
            companyId: string;
            title: string;
            ticketNumber: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        message: string | null;
        sentAt: Date | null;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    })[]>;
    markReminderSent(reminderId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        message: string | null;
        sentAt: Date | null;
        isSent: boolean;
        remindAt: Date;
        ticketId: string;
        recurrence: import(".prisma/client").$Enums.ReminderRecurrence;
        intervalDays: number | null;
        recurrenceEnd: Date | null;
        recurrenceCount: number | null;
        sentCount: number;
    }>;
    private calculateNextReminderTime;
    getSummary(companyId: string, userId: string): Promise<{
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
}
