import { AttendanceType, AttendanceStatus } from '@prisma/client';
export declare class UpdateAttendanceDto {
    type?: AttendanceType;
    status?: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    breakMinutes?: number;
    overtimeMinutes?: number;
    notes?: string;
}
