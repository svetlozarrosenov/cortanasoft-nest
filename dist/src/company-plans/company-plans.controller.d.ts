import { CompanyPlansService } from './company-plans.service';
import { CreateCompanyPlanDto, UpdateCompanyPlanDto, QueryCompanyPlanDto } from './dto';
import { CompanyPlanStatus } from '@prisma/client';
export declare class CompanyPlansController {
    private readonly companyPlansService;
    constructor(companyPlansService: CompanyPlansService);
    create(companyId: string, req: any, dto: CreateCompanyPlanDto): Promise<{
        success: boolean;
        plan: {
            company: {
                name: string;
                address: string | null;
                eik: string;
                id: string;
                postalCode: string | null;
                vatNumber: string | null;
                city: string | null;
            };
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
            items: ({
                product: {
                    name: string;
                    sku: string;
                    id: string;
                    unit: import(".prisma/client").$Enums.Unit;
                } | null;
            } & {
                createdAt: Date;
                description: string;
                quantity: import("@prisma/client/runtime/library").Decimal;
                total: import("@prisma/client/runtime/library").Decimal;
                updatedAt: Date;
                id: string;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                productId: string | null;
                planId: string;
            })[];
            generatedInvoices: ({
                invoice: {
                    status: import(".prisma/client").$Enums.InvoiceStatus;
                    total: import("@prisma/client/runtime/library").Decimal;
                    invoiceNumber: string;
                    id: string;
                    invoiceDate: Date;
                };
            } & {
                createdAt: Date;
                id: string;
                planId: string;
                invoiceId: string;
                billingPeriodStart: Date;
                billingPeriodEnd: Date;
            })[];
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        };
    }>;
    findAll(companyId: string, query: QueryCompanyPlanDto): Promise<{
        data: ({
            company: {
                name: string;
                id: string;
            };
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        success: boolean;
    }>;
    findOne(companyId: string, id: string): Promise<{
        success: boolean;
        plan: {
            company: {
                name: string;
                address: string | null;
                eik: string;
                id: string;
                postalCode: string | null;
                vatNumber: string | null;
                city: string | null;
            };
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
            items: ({
                product: {
                    name: string;
                    sku: string;
                    id: string;
                    unit: import(".prisma/client").$Enums.Unit;
                } | null;
            } & {
                createdAt: Date;
                description: string;
                quantity: import("@prisma/client/runtime/library").Decimal;
                total: import("@prisma/client/runtime/library").Decimal;
                updatedAt: Date;
                id: string;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                productId: string | null;
                planId: string;
            })[];
            generatedInvoices: ({
                invoice: {
                    status: import(".prisma/client").$Enums.InvoiceStatus;
                    total: import("@prisma/client/runtime/library").Decimal;
                    invoiceNumber: string;
                    id: string;
                    invoiceDate: Date;
                };
            } & {
                createdAt: Date;
                id: string;
                planId: string;
                invoiceId: string;
                billingPeriodStart: Date;
                billingPeriodEnd: Date;
            })[];
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        };
    }>;
    update(companyId: string, id: string, dto: UpdateCompanyPlanDto): Promise<{
        success: boolean;
        plan: {
            company: {
                name: string;
                address: string | null;
                eik: string;
                id: string;
                postalCode: string | null;
                vatNumber: string | null;
                city: string | null;
            };
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
            items: ({
                product: {
                    name: string;
                    sku: string;
                    id: string;
                    unit: import(".prisma/client").$Enums.Unit;
                } | null;
            } & {
                createdAt: Date;
                description: string;
                quantity: import("@prisma/client/runtime/library").Decimal;
                total: import("@prisma/client/runtime/library").Decimal;
                updatedAt: Date;
                id: string;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                productId: string | null;
                planId: string;
            })[];
            generatedInvoices: ({
                invoice: {
                    status: import(".prisma/client").$Enums.InvoiceStatus;
                    total: import("@prisma/client/runtime/library").Decimal;
                    invoiceNumber: string;
                    id: string;
                    invoiceDate: Date;
                };
            } & {
                createdAt: Date;
                id: string;
                planId: string;
                invoiceId: string;
                billingPeriodStart: Date;
                billingPeriodEnd: Date;
            })[];
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        };
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
        success: boolean;
    }>;
    findByCompany(companyId: string, targetCompanyId: string): Promise<{
        success: boolean;
        plans: ({
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        })[];
    }>;
    updateStatus(companyId: string, id: string, status: CompanyPlanStatus): Promise<{
        success: boolean;
        plan: {
            company: {
                name: string;
                address: string | null;
                eik: string;
                id: string;
                postalCode: string | null;
                vatNumber: string | null;
                city: string | null;
            };
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            _count: {
                items: number;
                generatedInvoices: number;
            };
            items: ({
                product: {
                    name: string;
                    sku: string;
                    id: string;
                    unit: import(".prisma/client").$Enums.Unit;
                } | null;
            } & {
                createdAt: Date;
                description: string;
                quantity: import("@prisma/client/runtime/library").Decimal;
                total: import("@prisma/client/runtime/library").Decimal;
                updatedAt: Date;
                id: string;
                vatRate: import("@prisma/client/runtime/library").Decimal;
                sortOrder: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                productId: string | null;
                planId: string;
            })[];
            generatedInvoices: ({
                invoice: {
                    status: import(".prisma/client").$Enums.InvoiceStatus;
                    total: import("@prisma/client/runtime/library").Decimal;
                    invoiceNumber: string;
                    id: string;
                    invoiceDate: Date;
                };
            } & {
                createdAt: Date;
                id: string;
                planId: string;
                invoiceId: string;
                billingPeriodStart: Date;
                billingPeriodEnd: Date;
            })[];
            createdBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            name: string;
            status: import(".prisma/client").$Enums.CompanyPlanStatus;
            createdAt: Date;
            description: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            startDate: Date;
            endDate: Date | null;
            updatedAt: Date;
            billingCycle: import(".prisma/client").$Enums.BillingCycle;
            nextInvoiceDate: Date | null;
            id: string;
            currencyId: string | null;
            companyId: string;
            billingDayOfMonth: number;
            invoiceNotes: string | null;
            autoInvoice: boolean;
            lastInvoiceDate: Date | null;
            createdById: string | null;
        };
    }>;
    generateInvoice(companyId: string, id: string): Promise<{
        success: boolean;
        invoice: {
            type: import(".prisma/client").$Enums.InvoiceType;
            status: import(".prisma/client").$Enums.InvoiceStatus;
            createdAt: Date;
            total: import("@prisma/client/runtime/library").Decimal;
            invoiceNumber: string;
            dueDate: Date | null;
            updatedAt: Date;
            id: string;
            currencyId: string | null;
            companyId: string;
            createdById: string | null;
            invoiceDate: Date;
            orderId: string | null;
            customerId: string | null;
            customerName: string;
            customerEik: string | null;
            customerVatNumber: string | null;
            customerAddress: string | null;
            customerCity: string | null;
            customerPostalCode: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            vatAmount: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            paidAmount: import("@prisma/client/runtime/library").Decimal;
            paymentMethod: import(".prisma/client").$Enums.PaymentMethod | null;
            paymentDate: Date | null;
            exchangeRate: import("@prisma/client/runtime/library").Decimal;
            notes: string | null;
        };
    }>;
}
