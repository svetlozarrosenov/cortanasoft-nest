import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, UpdateLeaveDto, QueryLeavesDto, RejectLeaveDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyLeavesController {
    private leavesService;
    private readonly exportService;
    constructor(leavesService: LeavesService, exportService: ExportService);
    create(companyId: string, dto: CreateLeaveDto, req: any): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    findAll(companyId: string, query: QueryLeavesDto): Promise<{
        data: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            };
            approvedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.LeaveType;
            status: import(".prisma/client").$Enums.LeaveStatus;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            days: number;
            updatedAt: Date;
            id: string;
            companyId: string;
            userId: string;
            approvedById: string | null;
            approvedAt: Date | null;
            reason: string | null;
            rejectionNote: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getSummary(companyId: string): Promise<{
        pending: number;
        approvedThisMonth: number;
        onLeaveToday: number;
    }>;
    export(companyId: string, query: QueryLeavesDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    getMyLeaves(companyId: string, query: QueryLeavesDto, req: any): Promise<{
        data: ({
            user: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            };
            approvedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.LeaveType;
            status: import(".prisma/client").$Enums.LeaveStatus;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            days: number;
            updatedAt: Date;
            id: string;
            companyId: string;
            userId: string;
            approvedById: string | null;
            approvedAt: Date | null;
            reason: string | null;
            rejectionNote: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getMyBalance(companyId: string, year: string, req: any): Promise<{
        year: number;
        annual: {
            total: number;
            used: number;
            remaining: number;
            carried: number;
        };
        sick: {
            used: number;
        };
        unpaid: {
            used: number;
        };
    }>;
    getBalance(companyId: string, userId: string, year: string): Promise<{
        year: number;
        annual: {
            total: number;
            used: number;
            remaining: number;
            carried: number;
        };
        sick: {
            used: number;
        };
        unpaid: {
            used: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateLeaveDto, req: any): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    approve(companyId: string, id: string, req: any): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    reject(companyId: string, id: string, dto: RejectLeaveDto, req: any): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    cancel(companyId: string, id: string, req: any): Promise<{
        user: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        type: import(".prisma/client").$Enums.LeaveType;
        status: import(".prisma/client").$Enums.LeaveStatus;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        days: number;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    remove(companyId: string, id: string, req: any): Promise<{
        success: boolean;
    }>;
}
