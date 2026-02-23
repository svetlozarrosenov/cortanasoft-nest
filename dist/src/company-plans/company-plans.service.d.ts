import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyPlanDto, UpdateCompanyPlanDto, QueryCompanyPlanDto } from './dto';
import { Prisma, CompanyPlanStatus } from '@prisma/client';
export declare class CompanyPlansService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly planInclude;
    create(adminCompanyId: string, userId: string, dto: CreateCompanyPlanDto): Promise<{
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        company: {
            id: string;
            name: string;
            postalCode: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
        };
        _count: {
            items: number;
            generatedInvoices: number;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            productId: string | null;
            sortOrder: number;
            total: Prisma.Decimal;
            planId: string;
        })[];
        generatedInvoices: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            planId: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            invoiceId: string;
        })[];
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    }>;
    findAll(adminCompanyId: string, query: QueryCompanyPlanDto): Promise<{
        data: ({
            currency: {
                symbol: string;
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
            company: {
                id: string;
                name: string;
            };
            _count: {
                items: number;
                generatedInvoices: number;
            };
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            currencyId: string | null;
            description: string | null;
            companyId: string;
            amount: Prisma.Decimal;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            billingDayOfMonth: number;
            startDate: Date;
            endDate: Date | null;
            invoiceNotes: string | null;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            nextInvoiceDate: Date | null;
            createdById: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(adminCompanyId: string, id: string): Promise<{
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        company: {
            id: string;
            name: string;
            postalCode: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
        };
        _count: {
            items: number;
            generatedInvoices: number;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            productId: string | null;
            sortOrder: number;
            total: Prisma.Decimal;
            planId: string;
        })[];
        generatedInvoices: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            planId: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            invoiceId: string;
        })[];
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    }>;
    update(adminCompanyId: string, id: string, dto: UpdateCompanyPlanDto): Promise<{
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        company: {
            id: string;
            name: string;
            postalCode: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
        };
        _count: {
            items: number;
            generatedInvoices: number;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            productId: string | null;
            sortOrder: number;
            total: Prisma.Decimal;
            planId: string;
        })[];
        generatedInvoices: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            planId: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            invoiceId: string;
        })[];
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    }>;
    remove(adminCompanyId: string, id: string): Promise<{
        message: string;
    }>;
    findByCompany(adminCompanyId: string, companyId: string): Promise<({
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        _count: {
            items: number;
            generatedInvoices: number;
        };
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    })[]>;
    updateStatus(adminCompanyId: string, id: string, status: CompanyPlanStatus): Promise<{
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        company: {
            id: string;
            name: string;
            postalCode: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
        };
        _count: {
            items: number;
            generatedInvoices: number;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            productId: string | null;
            sortOrder: number;
            total: Prisma.Decimal;
            planId: string;
        })[];
        generatedInvoices: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            planId: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            invoiceId: string;
        })[];
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    }>;
    private calculateNextInvoiceDate;
    getPlansForInvoicing(): Promise<({
        currency: {
            symbol: string;
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        company: {
            id: string;
            name: string;
            postalCode: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
        };
        _count: {
            items: number;
            generatedInvoices: number;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import(".prisma/client").$Enums.Unit;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            quantity: Prisma.Decimal;
            unitPrice: Prisma.Decimal;
            vatRate: Prisma.Decimal;
            productId: string | null;
            sortOrder: number;
            total: Prisma.Decimal;
            planId: string;
        })[];
        generatedInvoices: ({
            invoice: {
                id: string;
                status: import(".prisma/client").$Enums.InvoiceStatus;
                total: Prisma.Decimal;
                invoiceNumber: string;
                invoiceDate: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            planId: string;
            billingPeriodStart: Date;
            billingPeriodEnd: Date;
            invoiceId: string;
        })[];
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        currencyId: string | null;
        description: string | null;
        companyId: string;
        amount: Prisma.Decimal;
        billingCycle: import(".prisma/client").$Enums.BillingCycle;
        billingDayOfMonth: number;
        startDate: Date;
        endDate: Date | null;
        invoiceNotes: string | null;
        status: import(".prisma/client").$Enums.CompanyPlanStatus;
        autoInvoice: boolean;
        lastInvoiceDate: Date | null;
        nextInvoiceDate: Date | null;
        createdById: string | null;
    })[]>;
    generateInvoice(planId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.InvoiceType;
        currencyId: string | null;
        companyId: string;
        status: import(".prisma/client").$Enums.InvoiceStatus;
        createdById: string | null;
        total: Prisma.Decimal;
        invoiceNumber: string;
        invoiceDate: Date;
        dueDate: Date | null;
        orderId: string | null;
        customerId: string | null;
        customerName: string;
        customerEik: string | null;
        customerVatNumber: string | null;
        customerAddress: string | null;
        customerCity: string | null;
        customerPostalCode: string | null;
        subtotal: Prisma.Decimal;
        vatAmount: Prisma.Decimal;
        discount: Prisma.Decimal;
        paidAmount: Prisma.Decimal;
        paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
        paymentDate: Date | null;
        exchangeRate: Prisma.Decimal;
        notes: string | null;
    }>;
}
