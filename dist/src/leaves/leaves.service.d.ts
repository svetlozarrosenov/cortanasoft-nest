import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto, UpdateLeaveDto, QueryLeavesDto, RejectLeaveDto } from './dto';
export declare class LeavesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, userId: string, dto: CreateLeaveDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    findAll(companyId: string, query: QueryLeavesDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            approvedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.LeaveType;
            companyId: string;
            userId: string;
            days: number;
            startDate: Date;
            endDate: Date;
            status: import(".prisma/client").$Enums.LeaveStatus;
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
    findOne(companyId: string, id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    update(companyId: string, id: string, userId: string, dto: UpdateLeaveDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    approve(companyId: string, id: string, approverId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    reject(companyId: string, id: string, approverId: string, dto: RejectLeaveDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    cancel(companyId: string, id: string, userId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        approvedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LeaveType;
        companyId: string;
        userId: string;
        days: number;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.LeaveStatus;
        approvedById: string | null;
        approvedAt: Date | null;
        reason: string | null;
        rejectionNote: string | null;
    }>;
    remove(companyId: string, id: string, userId: string): Promise<{
        success: boolean;
    }>;
    getBalance(companyId: string, userId: string, year?: number): Promise<{
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
    getMyLeaves(companyId: string, userId: string, query: QueryLeavesDto): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            approvedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.LeaveType;
            companyId: string;
            userId: string;
            days: number;
            startDate: Date;
            endDate: Date;
            status: import(".prisma/client").$Enums.LeaveStatus;
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
}
