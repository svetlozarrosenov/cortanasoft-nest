import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
    companyId: string;
    roleId: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
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
}
export {};
