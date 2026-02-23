import { LeaveType } from './create-leave.dto';
export declare class UpdateLeaveDto {
    type?: LeaveType;
    startDate?: string;
    endDate?: string;
    days?: number;
    reason?: string;
}
export declare class ApproveLeaveDto {
    note?: string;
}
export declare class RejectLeaveDto {
    rejectionNote: string;
}
