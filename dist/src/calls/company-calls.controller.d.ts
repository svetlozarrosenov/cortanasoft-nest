import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CallsService } from './calls.service';
import { CreateCallDto, UpdateCallDto, QueryCallsDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { CallOutcome } from '@prisma/client';
export declare class CompanyCallsController {
    private readonly callsService;
    private readonly exportService;
    constructor(callsService: CallsService, exportService: ExportService);
    create(companyId: string, req: {
        user: {
            id: string;
        };
    }, createCallDto: CreateCallDto): Promise<any>;
    findAll(companyId: string, query: QueryCallsDto): Promise<{
        items: any;
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
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
    getUpcomingCalls(companyId: string, req: {
        user: {
            id: string;
        };
    }, limit?: string, allUsers?: string): Promise<any>;
    export(companyId: string, query: QueryCallsDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findOne(companyId: string, id: string): Promise<any>;
    update(companyId: string, id: string, updateCallDto: UpdateCallDto): Promise<any>;
    logCall(companyId: string, id: string, body: {
        outcome: CallOutcome;
        notes?: string;
        duration?: number;
    }): Promise<any>;
    remove(companyId: string, id: string): Promise<any>;
}
