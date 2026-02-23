import { AttendanceType, AttendanceStatus } from '@prisma/client';
export declare class QueryAttendanceDto {
    userId?: string;
    type?: AttendanceType;
    status?: AttendanceStatus;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
