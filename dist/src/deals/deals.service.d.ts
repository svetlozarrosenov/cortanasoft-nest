import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto, UpdateDealDto, QueryDealsDto } from './dto';
import { Prisma, DealStatus } from '@prisma/client';
export declare class DealsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateDealDto, userId?: string): Promise<{
        currency: {
            symbol: string;
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
        } | null;
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            companyName: string | null;
            firstName: string | null;
            lastName: string | null;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        amount: Prisma.Decimal | null;
        status: import(".prisma/client").$Enums.DealStatus;
        probability: number | null;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
        source: string | null;
        lostReason: string | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        customerId: string | null;
        assignedToId: string | null;
        companyId: string;
        createdById: string | null;
    }>;
    findAll(companyId: string, query: QueryDealsDto): Promise<{
        items: ({
            currency: {
                symbol: string;
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
            } | null;
            customer: {
                id: string;
                type: import(".prisma/client").$Enums.CustomerType;
                companyName: string | null;
                firstName: string | null;
                lastName: string | null;
            } | null;
            assignedTo: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            name: string;
            description: string | null;
            amount: Prisma.Decimal | null;
            status: import(".prisma/client").$Enums.DealStatus;
            probability: number | null;
            expectedCloseDate: Date | null;
            actualCloseDate: Date | null;
            source: string | null;
            lostReason: string | null;
            notes: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            currencyId: string | null;
            customerId: string | null;
            assignedToId: string | null;
            companyId: string;
            createdById: string | null;
        })[];
        data: ({
            currency: {
                symbol: string;
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                code: string;
            } | null;
            customer: {
                id: string;
                type: import(".prisma/client").$Enums.CustomerType;
                companyName: string | null;
                firstName: string | null;
                lastName: string | null;
            } | null;
            assignedTo: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            name: string;
            description: string | null;
            amount: Prisma.Decimal | null;
            status: import(".prisma/client").$Enums.DealStatus;
            probability: number | null;
            expectedCloseDate: Date | null;
            actualCloseDate: Date | null;
            source: string | null;
            lostReason: string | null;
            notes: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            currencyId: string | null;
            customerId: string | null;
            assignedToId: string | null;
            companyId: string;
            createdById: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(companyId: string, id: string): Promise<{
        currency: {
            symbol: string;
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
        } | null;
        customer: {
            id: string;
            phone: string | null;
            email: string | null;
            type: import(".prisma/client").$Enums.CustomerType;
            companyName: string | null;
            firstName: string | null;
            lastName: string | null;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        createdBy: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        amount: Prisma.Decimal | null;
        status: import(".prisma/client").$Enums.DealStatus;
        probability: number | null;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
        source: string | null;
        lostReason: string | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        customerId: string | null;
        assignedToId: string | null;
        companyId: string;
        createdById: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateDealDto): Promise<{
        currency: {
            symbol: string;
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
        } | null;
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            companyName: string | null;
            firstName: string | null;
            lastName: string | null;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        amount: Prisma.Decimal | null;
        status: import(".prisma/client").$Enums.DealStatus;
        probability: number | null;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
        source: string | null;
        lostReason: string | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        customerId: string | null;
        assignedToId: string | null;
        companyId: string;
        createdById: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        amount: Prisma.Decimal | null;
        status: import(".prisma/client").$Enums.DealStatus;
        probability: number | null;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
        source: string | null;
        lostReason: string | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        customerId: string | null;
        assignedToId: string | null;
        companyId: string;
        createdById: string | null;
    }>;
    updateStatus(companyId: string, id: string, status: DealStatus, lostReason?: string): Promise<{
        currency: {
            symbol: string;
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            code: string;
        } | null;
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            companyName: string | null;
            firstName: string | null;
            lastName: string | null;
        } | null;
        assignedTo: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        description: string | null;
        amount: Prisma.Decimal | null;
        status: import(".prisma/client").$Enums.DealStatus;
        probability: number | null;
        expectedCloseDate: Date | null;
        actualCloseDate: Date | null;
        source: string | null;
        lostReason: string | null;
        notes: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        customerId: string | null;
        assignedToId: string | null;
        companyId: string;
        createdById: string | null;
    }>;
    getStatuses(): ("QUALIFICATION" | "NEEDS_ANALYSIS" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST")[];
    getStatistics(companyId: string): Promise<{
        totalDeals: number;
        openDeals: number;
        wonDeals: number;
        lostDeals: number;
        totalPipelineValue: number | Prisma.Decimal;
        totalWonValue: number | Prisma.Decimal;
        winRate: number;
    }>;
}
