import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    validateUser(email: string, password: string): Promise<{
        defaultUserCompany: {
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                isDefault: boolean;
                companyId: string;
            };
            company: {
                currency: {
                    symbol: string;
                    id: string;
                    code: string;
                    name: string;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                } | null;
            } & {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                postalCode: string | null;
                countryId: string | null;
                vatNumber: string | null;
                eik: string;
                address: string | null;
                city: string | null;
                settlementId: string | null;
                molName: string | null;
                phone: string | null;
                email: string | null;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                bic: string | null;
                currencyId: string | null;
                pushNotificationsEnabled: boolean;
                role: import(".prisma/client").$Enums.CompanyRole;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            companyId: string;
            userId: string;
            roleId: string;
        };
        userCompanies: ({
            role: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                isDefault: boolean;
                companyId: string;
            };
            company: {
                currency: {
                    symbol: string;
                    id: string;
                    code: string;
                    name: string;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                } | null;
            } & {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                postalCode: string | null;
                countryId: string | null;
                vatNumber: string | null;
                eik: string;
                address: string | null;
                city: string | null;
                settlementId: string | null;
                molName: string | null;
                phone: string | null;
                email: string | null;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                bic: string | null;
                currencyId: string | null;
                pushNotificationsEnabled: boolean;
                role: import(".prisma/client").$Enums.CompanyRole;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            companyId: string;
            userId: string;
            roleId: string;
        })[];
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string;
        lastName: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            isActive: boolean;
            isSuperAdmin: boolean;
            currentCompany: {
                currency: {
                    symbol: string;
                    id: string;
                    code: string;
                    name: string;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                } | null;
            } & {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                postalCode: string | null;
                countryId: string | null;
                vatNumber: string | null;
                eik: string;
                address: string | null;
                city: string | null;
                settlementId: string | null;
                molName: string | null;
                phone: string | null;
                email: string | null;
                website: string | null;
                bankName: string | null;
                iban: string | null;
                bic: string | null;
                currencyId: string | null;
                pushNotificationsEnabled: boolean;
                role: import(".prisma/client").$Enums.CompanyRole;
            };
            currentRole: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                permissions: import("@prisma/client/runtime/library").JsonValue;
                isDefault: boolean;
                companyId: string;
            };
            companies: {
                id: string;
                name: string;
                eik: string;
                role: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    isDefault: boolean;
                    companyId: string;
                };
                isDefault: boolean;
            }[];
        };
        accessToken: string;
        rememberMe: boolean;
    }>;
    switchCompany(userId: string, companyId: string): Promise<{
        accessToken: string;
        currentCompany: {
            currency: {
                symbol: string;
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            postalCode: string | null;
            countryId: string | null;
            vatNumber: string | null;
            eik: string;
            address: string | null;
            city: string | null;
            settlementId: string | null;
            molName: string | null;
            phone: string | null;
            email: string | null;
            website: string | null;
            bankName: string | null;
            iban: string | null;
            bic: string | null;
            currencyId: string | null;
            pushNotificationsEnabled: boolean;
            role: import(".prisma/client").$Enums.CompanyRole;
        };
        currentRole: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            isDefault: boolean;
            companyId: string;
        };
        isSuperAdmin: boolean;
    }>;
    getCookieOptions(rememberMe?: boolean): {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict";
        maxAge: number;
        path: string;
    } | {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        maxAge: number;
        path: string;
    };
}
