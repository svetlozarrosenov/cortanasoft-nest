import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';
import { Prisma, CustomerType } from '@prisma/client';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateCustomerDto): Promise<{
        country: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        _count: {
            orders: number;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.CustomerType;
        stage: import(".prisma/client").$Enums.CustomerStage;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        eik: string | null;
        vatNumber: string | null;
        molName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        website: string | null;
        notes: string | null;
        description: string | null;
        tags: string[];
        creditLimit: Prisma.Decimal | null;
        discount: Prisma.Decimal | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        countryId: string | null;
        companyId: string;
        assignedToId: string | null;
    }>;
    findAll(companyId: string, query: QueryCustomersDto): Promise<{
        data: ({
            country: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                nativeName: string | null;
                phoneCode: string | null;
                isEU: boolean;
            } | null;
            assignedTo: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            _count: {
                orders: number;
            };
        } & {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            stage: import(".prisma/client").$Enums.CustomerStage;
            source: import(".prisma/client").$Enums.CustomerSource | null;
            companyName: string | null;
            eik: string | null;
            vatNumber: string | null;
            molName: string | null;
            firstName: string | null;
            lastName: string | null;
            email: string | null;
            phone: string | null;
            mobile: string | null;
            address: string | null;
            city: string | null;
            postalCode: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            industry: import(".prisma/client").$Enums.Industry | null;
            size: import(".prisma/client").$Enums.CompanySize | null;
            website: string | null;
            notes: string | null;
            description: string | null;
            tags: string[];
            creditLimit: Prisma.Decimal | null;
            discount: Prisma.Decimal | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            countryId: string | null;
            companyId: string;
            assignedToId: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        country: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        assignedTo: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        orders: {
            id: string;
            orderNumber: string;
            orderDate: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            total: Prisma.Decimal;
        }[];
        _count: {
            orders: number;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.CustomerType;
        stage: import(".prisma/client").$Enums.CustomerStage;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        eik: string | null;
        vatNumber: string | null;
        molName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        website: string | null;
        notes: string | null;
        description: string | null;
        tags: string[];
        creditLimit: Prisma.Decimal | null;
        discount: Prisma.Decimal | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        countryId: string | null;
        companyId: string;
        assignedToId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateCustomerDto): Promise<{
        country: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        } | null;
        _count: {
            orders: number;
        };
    } & {
        id: string;
        type: import(".prisma/client").$Enums.CustomerType;
        stage: import(".prisma/client").$Enums.CustomerStage;
        source: import(".prisma/client").$Enums.CustomerSource | null;
        companyName: string | null;
        eik: string | null;
        vatNumber: string | null;
        molName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        mobile: string | null;
        address: string | null;
        city: string | null;
        postalCode: string | null;
        bankName: string | null;
        iban: string | null;
        bic: string | null;
        industry: import(".prisma/client").$Enums.Industry | null;
        size: import(".prisma/client").$Enums.CompanySize | null;
        website: string | null;
        notes: string | null;
        description: string | null;
        tags: string[];
        creditLimit: Prisma.Decimal | null;
        discount: Prisma.Decimal | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        countryId: string | null;
        companyId: string;
        assignedToId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
    getDisplayName(customer: {
        type: CustomerType;
        companyName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
    }): string;
}
