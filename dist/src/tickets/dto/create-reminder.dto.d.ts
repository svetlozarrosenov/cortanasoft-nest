export declare enum ReminderRecurrence {
    NONE = "NONE",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    BIWEEKLY = "BIWEEKLY",
    MONTHLY = "MONTHLY",
    CUSTOM = "CUSTOM"
}
export declare class CreateReminderDto {
    remindAt: string;
    message?: string;
    userId?: string;
    recurrence?: ReminderRecurrence;
    intervalDays?: number;
    recurrenceEnd?: string;
    recurrenceCount?: number;
}
