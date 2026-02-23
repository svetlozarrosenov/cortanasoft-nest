import { AdminService } from './admin.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignUserToCompanyDto } from './dto/assign-user-to-company.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyPlansService } from '../company-plans/company-plans.service';
import { CreateCompanyPlanDto, UpdateCompanyPlanDto } from '../company-plans/dto';
import { CompanyPlanStatus } from '@prisma/client';
export declare class AdminController {
    private adminService;
    private prisma;
    private companyPlansService;
    constructor(adminService: AdminService, prisma: PrismaService, companyPlansService: CompanyPlansService);
    getAllCompanies(): Promise<{
        success: boolean;
        companies: ({
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
            } | null;
            userCompanies: ({
                user: {
                    email: string;
                    id: string;
                    isActive: boolean;
                    firstName: string;
                    lastName: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            _count: {
                userCompanies: number;
            };
        } & {
            name: string;
            email: string | null;
            phone: string | null;
            createdAt: Date;
            address: string | null;
            eik: string;
            updatedAt: Date;
            role: import(".prisma/client").$Enums.CompanyRole;
            id: string;
            isActive: boolean;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            city: string | null;
            settlementId: string | null;
            molName: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            currencyId: string | null;
            pushNotificationsEnabled: boolean;
        })[];
    }>;
    getCompanyById(id: string): Promise<{
        success: boolean;
        company: {
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
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
            settlement: {
                name: string;
                type: import(".prisma/client").$Enums.SettlementType;
                createdAt: Date;
                updatedAt: Date;
                id: string;
                isActive: boolean;
                ekatte: string | null;
                postalCode: string | null;
                municipality: string | null;
                region: string | null;
                countryId: string;
            } | null;
            userCompanies: ({
                user: {
                    email: string;
                    id: string;
                    isActive: boolean;
                    firstName: string;
                    lastName: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
        } & {
            name: string;
            email: string | null;
            phone: string | null;
            createdAt: Date;
            address: string | null;
            eik: string;
            updatedAt: Date;
            role: import(".prisma/client").$Enums.CompanyRole;
            id: string;
            isActive: boolean;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            city: string | null;
            settlementId: string | null;
            molName: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            currencyId: string | null;
            pushNotificationsEnabled: boolean;
        };
    }>;
    createCompany(dto: CreateCompanyDto): Promise<{
        success: boolean;
        company: {
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
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
            settlement: {
                name: string;
                type: import(".prisma/client").$Enums.SettlementType;
                createdAt: Date;
                updatedAt: Date;
                id: string;
                isActive: boolean;
                ekatte: string | null;
                postalCode: string | null;
                municipality: string | null;
                region: string | null;
                countryId: string;
            } | null;
        } & {
            name: string;
            email: string | null;
            phone: string | null;
            createdAt: Date;
            address: string | null;
            eik: string;
            updatedAt: Date;
            role: import(".prisma/client").$Enums.CompanyRole;
            id: string;
            isActive: boolean;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            city: string | null;
            settlementId: string | null;
            molName: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            currencyId: string | null;
            pushNotificationsEnabled: boolean;
        };
    }>;
    updateCompany(id: string, dto: UpdateCompanyDto): Promise<{
        success: boolean;
        company: {
            currency: {
                symbol: string;
                name: string;
                createdAt: Date;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
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
            settlement: {
                name: string;
                type: import(".prisma/client").$Enums.SettlementType;
                createdAt: Date;
                updatedAt: Date;
                id: string;
                isActive: boolean;
                ekatte: string | null;
                postalCode: string | null;
                municipality: string | null;
                region: string | null;
                countryId: string;
            } | null;
        } & {
            name: string;
            email: string | null;
            phone: string | null;
            createdAt: Date;
            address: string | null;
            eik: string;
            updatedAt: Date;
            role: import(".prisma/client").$Enums.CompanyRole;
            id: string;
            isActive: boolean;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            city: string | null;
            settlementId: string | null;
            molName: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            currencyId: string | null;
            pushNotificationsEnabled: boolean;
        };
    }>;
    deleteCompany(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllUsers(): Promise<{
        success: boolean;
        users: {
            email: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            userCompanies: ({
                company: {
                    name: string;
                    eik: string;
                    role: import(".prisma/client").$Enums.CompanyRole;
                    id: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            firstName: string;
            lastName: string;
        }[];
    }>;
    getUserById(id: string): Promise<{
        success: boolean;
        user: {
            email: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            userCompanies: ({
                company: {
                    name: string;
                    eik: string;
                    role: import(".prisma/client").$Enums.CompanyRole;
                    id: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            firstName: string;
            lastName: string;
        };
    }>;
    createUser(dto: CreateUserDto): Promise<{
        success: boolean;
        user: {
            email: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            userCompanies: ({
                company: {
                    name: string;
                    eik: string;
                    role: import(".prisma/client").$Enums.CompanyRole;
                    id: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            firstName: string;
            lastName: string;
        };
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
        success: boolean;
        user: {
            email: string;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            userCompanies: ({
                company: {
                    name: string;
                    eik: string;
                    role: import(".prisma/client").$Enums.CompanyRole;
                    id: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            firstName: string;
            lastName: string;
        };
    }>;
    deleteUser(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getRolesByCompany(companyId: string): Promise<{
        success: boolean;
        roles: ({
            _count: {
                userCompanies: number;
            };
        } & {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            companyId: string;
        })[];
    }>;
    getRoleById(id: string): Promise<{
        success: boolean;
        role: {
            company: {
                name: string;
                id: string;
            };
            _count: {
                userCompanies: number;
            };
        } & {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            companyId: string;
        };
    }>;
    createRole(dto: CreateRoleDto): Promise<{
        success: boolean;
        role: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            companyId: string;
        };
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        success: boolean;
        role: {
            name: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            companyId: string;
        };
    }>;
    deleteRole(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getUsersByCompany(companyId: string): Promise<{
        success: boolean;
        users: ({
            user: {
                email: string;
                createdAt: Date;
                id: string;
                isActive: boolean;
                firstName: string;
                lastName: string;
            };
            role: {
                name: string;
                createdAt: Date;
                description: string | null;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                companyId: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            companyId: string;
            userId: string;
            roleId: string;
        })[];
    }>;
    getAvailableUsersForCompany(companyId: string): Promise<{
        success: boolean;
        users: {
            email: string;
            createdAt: Date;
            id: string;
            isActive: boolean;
            userCompanies: ({
                company: {
                    name: string;
                    id: string;
                };
                role: {
                    name: string;
                    createdAt: Date;
                    description: string | null;
                    updatedAt: Date;
                    isDefault: boolean;
                    id: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    companyId: string;
                };
            } & {
                createdAt: Date;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                companyId: string;
                userId: string;
                roleId: string;
            })[];
            firstName: string;
            lastName: string;
        }[];
    }>;
    assignUserToCompany(companyId: string, dto: AssignUserToCompanyDto): Promise<{
        success: boolean;
        userCompany: {
            user: {
                email: string;
                createdAt: Date;
                id: string;
                isActive: boolean;
                firstName: string;
                lastName: string;
            };
            role: {
                name: string;
                createdAt: Date;
                description: string | null;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                companyId: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            companyId: string;
            userId: string;
            roleId: string;
        };
    }>;
    updateUserCompanyRole(companyId: string, userId: string, roleId: string): Promise<{
        success: boolean;
        userCompany: {
            user: {
                email: string;
                createdAt: Date;
                id: string;
                isActive: boolean;
                firstName: string;
                lastName: string;
            };
            role: {
                name: string;
                createdAt: Date;
                description: string | null;
                updatedAt: Date;
                isDefault: boolean;
                id: string;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                companyId: string;
            };
        } & {
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            companyId: string;
            userId: string;
            roleId: string;
        };
    }>;
    removeUserFromCompany(companyId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCompanyPlans(companyId: string): Promise<{
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
    getCompanyPlan(id: string): Promise<{
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
    createCompanyPlan(req: any, dto: CreateCompanyPlanDto): Promise<{
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
    updateCompanyPlan(id: string, dto: UpdateCompanyPlanDto): Promise<{
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
    updateCompanyPlanStatus(id: string, status: CompanyPlanStatus): Promise<{
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
    generatePlanInvoice(id: string): Promise<{
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
    deleteCompanyPlan(id: string): Promise<{
        message: string;
        success: boolean;
    }>;
}
