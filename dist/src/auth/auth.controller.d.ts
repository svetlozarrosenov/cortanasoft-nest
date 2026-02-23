import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, response: Response): Promise<{
        success: boolean;
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
    }>;
    logout(response: Response): Promise<{
        success: boolean;
        message: string;
    }>;
    me(user: any): Promise<{
        success: boolean;
        user: any;
    }>;
    switchCompany(user: any, companyId: string, response: Response): Promise<{
        success: boolean;
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
}
