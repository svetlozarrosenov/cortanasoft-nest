import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Prisma } from '@prisma/client';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllCompanies(): Promise<({
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
                permissions: Prisma.JsonValue;
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
    })[]>;
    findCompanyById(id: string): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }>;
    createCompany(dto: CreateCompanyDto): Promise<{
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
    }>;
    updateCompany(id: string, dto: UpdateCompanyDto): Promise<{
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
    }>;
    deleteCompany(id: string): Promise<{
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
    }>;
    findAllUsers(): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }[]>;
    findUserById(id: string): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }>;
    createUser(dto: CreateUserDto): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }>;
    updateUser(id: string, dto: UpdateUserDto): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }>;
    deleteUser(id: string): Promise<{
        email: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        password: string;
        firstName: string;
        lastName: string;
    }>;
    findRolesByCompany(companyId: string): Promise<({
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
        permissions: Prisma.JsonValue;
        companyId: string;
    })[]>;
    findRoleById(id: string): Promise<{
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
        permissions: Prisma.JsonValue;
        companyId: string;
    }>;
    createRole(dto: CreateRoleDto): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        permissions: Prisma.JsonValue;
        companyId: string;
    }>;
    updateRole(id: string, dto: UpdateRoleDto): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        permissions: Prisma.JsonValue;
        companyId: string;
    }>;
    deleteRole(id: string): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        permissions: Prisma.JsonValue;
        companyId: string;
    }>;
    findUsersByCompany(companyId: string): Promise<({
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
            permissions: Prisma.JsonValue;
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
    })[]>;
    findUsersNotInCompany(companyId: string): Promise<{
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
                permissions: Prisma.JsonValue;
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
    }[]>;
    assignUserToCompany(companyId: string, userId: string, roleId: string, isDefault?: boolean): Promise<{
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
            permissions: Prisma.JsonValue;
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
    }>;
    removeUserFromCompany(companyId: string, userId: string): Promise<{
        createdAt: Date;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        companyId: string;
        userId: string;
        roleId: string;
    }>;
    updateUserCompanyRole(companyId: string, userId: string, roleId: string): Promise<{
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
            permissions: Prisma.JsonValue;
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
    }>;
}
