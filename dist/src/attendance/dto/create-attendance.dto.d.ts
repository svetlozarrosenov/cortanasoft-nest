import { AttendanceType, AttendanceStatus } from '@prisma/client';
export declare class CreateAttendanceDto {
    date: string;
    type?: AttendanceType;
    status?: AttendanceStatus;
    userId?: string;
    checkIn?: string;
    checkOut?: string;
    breakMinutes?: number;
    overtimeMinutes?: number;
    notes?: string;
}
