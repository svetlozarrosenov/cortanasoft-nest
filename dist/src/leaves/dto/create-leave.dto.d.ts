export declare enum LeaveType {
    ANNUAL = "ANNUAL",
    SICK = "SICK",
    UNPAID = "UNPAID",
    MATERNITY = "MATERNITY",
    PATERNITY = "PATERNITY",
    BEREAVEMENT = "BEREAVEMENT",
    STUDY = "STUDY",
    OTHER = "OTHER"
}
export declare class CreateLeaveDto {
    type: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason?: string;
}
