export declare enum TicketPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    URGENT = "URGENT"
}
export declare enum TicketStatus {
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    IN_REVIEW = "IN_REVIEW",
    DONE = "DONE",
    CANCELLED = "CANCELLED"
}
export declare enum TicketType {
    TASK = "TASK",
    BUG = "BUG",
    FEATURE = "FEATURE",
    IMPROVEMENT = "IMPROVEMENT",
    SUPPORT = "SUPPORT"
}
export declare class CreateTicketDto {
    title: string;
    description?: string;
    type?: TicketType;
    priority?: TicketPriority;
    dueDate?: string;
    estimatedHours?: number;
    assigneeId?: string;
    parentId?: string;
    tags?: string;
}
