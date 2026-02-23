import { PrismaService } from '../prisma/prisma.service';
import { CreateCallDto, UpdateCallDto, QueryCallsDto } from './dto';
import { CallOutcome } from '@prisma/client';
export declare class CallsService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly callInclude;
    create(companyId: string, userId: string, dto: CreateCallDto): Promise<any>;
    findAll(companyId: string, query: QueryCallsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(companyId: string, id: string): Promise<any>;
    update(companyId: string, id: string, dto: UpdateCallDto): Promise<any>;
    remove(companyId: string, id: string): Promise<any>;
    logCall(companyId: string, id: string, outcome: CallOutcome, notes?: string, duration?: number): Promise<any>;
    getDirections(): Promise<unknown[]>;
    getOutcomes(): Promise<unknown[]>;
    getStatistics(companyId: string): Promise<{
        totalCalls: any;
        todayCalls: any;
        weekCalls: any;
        scheduledCalls: any;
        completedCalls: any;
        byDirection: any;
        byOutcome: any;
    }>;
    getUpcomingCalls(companyId: string, userId?: string, limit?: number): Promise<any>;
}
