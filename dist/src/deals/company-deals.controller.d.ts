import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, QueryDealsDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { DealStatus } from '@prisma/client';
export declare class CompanyDealsController {
    private readonly dealsService;
    private readonly exportService;
    constructor(dealsService: DealsService, exportService: ExportService);
    create(companyId: string, dto: CreateDealDto, req: any): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        } | null;
        assignedTo: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        currency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        status: import(".prisma/client").$Enums.DealStatus;
        createdAt: Date;
        probability: number | null;
        expectedCloseDate: Date | null;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        currencyId: string | null;
        companyId: string;
        createdById: string | null;
        customerId: string | null;
        notes: string | null;
        source: string | null;
        assignedToId: string | null;
        actualCloseDate: Date | null;
        lostReason: string | null;
    }>;
    findAll(companyId: string, query: QueryDealsDto): Promise<{
        items: ({
            customer: {
                type: import(".prisma/client").$Enums.CustomerType;
                id: string;
                firstName: string | null;
                lastName: string | null;
                companyName: string | null;
            } | null;
            assignedTo: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.DealStatus;
            createdAt: Date;
            probability: number | null;
            expectedCloseDate: Date | null;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            currencyId: string | null;
            companyId: string;
            createdById: string | null;
            customerId: string | null;
            notes: string | null;
            source: string | null;
            assignedToId: string | null;
            actualCloseDate: Date | null;
            lostReason: string | null;
        })[];
        data: ({
            customer: {
                type: import(".prisma/client").$Enums.CustomerType;
                id: string;
                firstName: string | null;
                lastName: string | null;
                companyName: string | null;
            } | null;
            assignedTo: {
                email: string;
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.DealStatus;
            createdAt: Date;
            probability: number | null;
            expectedCloseDate: Date | null;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            currencyId: string | null;
            companyId: string;
            createdById: string | null;
            customerId: string | null;
            notes: string | null;
            source: string | null;
            assignedToId: string | null;
            actualCloseDate: Date | null;
            lostReason: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getStatuses(): ("QUALIFICATION" | "NEEDS_ANALYSIS" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST")[];
    getStatistics(companyId: string): Promise<{
        totalDeals: number;
        openDeals: number;
        wonDeals: number;
        lostDeals: number;
        totalPipelineValue: number | import("@prisma/client/runtime/library").Decimal;
        totalWonValue: number | import("@prisma/client/runtime/library").Decimal;
        winRate: number;
    }>;
    export(companyId: string, query: QueryDealsDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findOne(companyId: string, id: string): Promise<{
        customer: {
            email: string | null;
            phone: string | null;
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        } | null;
        assignedTo: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        currency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
        createdBy: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        name: string;
        status: import(".prisma/client").$Enums.DealStatus;
        createdAt: Date;
        probability: number | null;
        expectedCloseDate: Date | null;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        currencyId: string | null;
        companyId: string;
        createdById: string | null;
        customerId: string | null;
        notes: string | null;
        source: string | null;
        assignedToId: string | null;
        actualCloseDate: Date | null;
        lostReason: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateDealDto): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        } | null;
        assignedTo: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        currency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        status: import(".prisma/client").$Enums.DealStatus;
        createdAt: Date;
        probability: number | null;
        expectedCloseDate: Date | null;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        currencyId: string | null;
        companyId: string;
        createdById: string | null;
        customerId: string | null;
        notes: string | null;
        source: string | null;
        assignedToId: string | null;
        actualCloseDate: Date | null;
        lostReason: string | null;
    }>;
    updateStatus(companyId: string, id: string, body: {
        status: DealStatus;
        lostReason?: string;
    }): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        } | null;
        assignedTo: {
            email: string;
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        currency: {
            symbol: string;
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
        } | null;
    } & {
        name: string;
        status: import(".prisma/client").$Enums.DealStatus;
        createdAt: Date;
        probability: number | null;
        expectedCloseDate: Date | null;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        currencyId: string | null;
        companyId: string;
        createdById: string | null;
        customerId: string | null;
        notes: string | null;
        source: string | null;
        assignedToId: string | null;
        actualCloseDate: Date | null;
        lostReason: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        name: string;
        status: import(".prisma/client").$Enums.DealStatus;
        createdAt: Date;
        probability: number | null;
        expectedCloseDate: Date | null;
        description: string | null;
        amount: import("@prisma/client/runtime/library").Decimal | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        currencyId: string | null;
        companyId: string;
        createdById: string | null;
        customerId: string | null;
        notes: string | null;
        source: string | null;
        assignedToId: string | null;
        actualCloseDate: Date | null;
        lostReason: string | null;
    }>;
}
