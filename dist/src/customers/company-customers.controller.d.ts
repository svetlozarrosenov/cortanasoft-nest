import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyCustomersController {
    private readonly customersService;
    private readonly exportService;
    constructor(customersService: CustomersService, exportService: ExportService);
    create(companyId: string, dto: CreateCustomerDto): Promise<{
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        country: {
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        _count: {
            orders: number;
        };
    } & {
        email: string | null;
        phone: string | null;
        type: import(".prisma/client").$Enums.CustomerType;
        createdAt: Date;
        stage: import(".prisma/client").$Enums.CustomerStage;
        description: string | null;
        address: string | null;
        eik: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        postalCode: string | null;
        countryId: string | null;
        vatNumber: string | null;
        city: string | null;
        molName: string | null;
        website: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        companyId: string;
        firstName: string | null;
        lastName: string | null;
        discount: import("@prisma/client/runtime/library").Decimal | null;
        notes: string | null;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        mobile: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        tags: string[];
        creditLimit: import("@prisma/client/runtime/library").Decimal | null;
        assignedToId: string | null;
    }>;
    findAll(companyId: string, query: QueryCustomersDto): Promise<{
        data: ({
            assignedTo: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            country: {
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
                nativeName: string | null;
                phoneCode: string | null;
                isEU: boolean;
            } | null;
            _count: {
                orders: number;
            };
        } & {
            email: string | null;
            phone: string | null;
            type: import(".prisma/client").$Enums.CustomerType;
            createdAt: Date;
            stage: import(".prisma/client").$Enums.CustomerStage;
            description: string | null;
            address: string | null;
            eik: string | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            city: string | null;
            molName: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            companyId: string;
            firstName: string | null;
            lastName: string | null;
            discount: import("@prisma/client/runtime/library").Decimal | null;
            notes: string | null;
            source: import(".prisma/client").$Enums.CustomerSource | null;
            companyName: string | null;
            mobile: string | null;
            industry: import(".prisma/client").$Enums.Industry | null;
            size: import(".prisma/client").$Enums.CompanySize | null;
            tags: string[];
            creditLimit: import("@prisma/client/runtime/library").Decimal | null;
            assignedToId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    export(companyId: string, query: QueryCustomersDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    getStages(): ("ACTIVE" | "LEAD" | "PROSPECT" | "INACTIVE")[];
    getSources(): ("WEBSITE" | "REFERRAL" | "SOCIAL_MEDIA" | "EMAIL" | "COLD_CALL" | "ADVERTISEMENT" | "TRADE_SHOW" | "OTHER")[];
    findOne(companyId: string, id: string): Promise<{
        orders: {
            status: import(".prisma/client").$Enums.OrderStatus;
            orderNumber: string;
            total: import("@prisma/client/runtime/library").Decimal;
            id: string;
            orderDate: Date;
        }[];
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        country: {
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        _count: {
            orders: number;
        };
    } & {
        email: string | null;
        phone: string | null;
        type: import(".prisma/client").$Enums.CustomerType;
        createdAt: Date;
        stage: import(".prisma/client").$Enums.CustomerStage;
        description: string | null;
        address: string | null;
        eik: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        postalCode: string | null;
        countryId: string | null;
        vatNumber: string | null;
        city: string | null;
        molName: string | null;
        website: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        companyId: string;
        firstName: string | null;
        lastName: string | null;
        discount: import("@prisma/client/runtime/library").Decimal | null;
        notes: string | null;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        mobile: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        tags: string[];
        creditLimit: import("@prisma/client/runtime/library").Decimal | null;
        assignedToId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateCustomerDto): Promise<{
        country: {
            name: string;
            createdAt: Date;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        _count: {
            orders: number;
        };
    } & {
        email: string | null;
        phone: string | null;
        type: import(".prisma/client").$Enums.CustomerType;
        createdAt: Date;
        stage: import(".prisma/client").$Enums.CustomerStage;
        description: string | null;
        address: string | null;
        eik: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        postalCode: string | null;
        countryId: string | null;
        vatNumber: string | null;
        city: string | null;
        molName: string | null;
        website: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        companyId: string;
        firstName: string | null;
        lastName: string | null;
        discount: import("@prisma/client/runtime/library").Decimal | null;
        notes: string | null;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        mobile: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        tags: string[];
        creditLimit: import("@prisma/client/runtime/library").Decimal | null;
        assignedToId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
}
