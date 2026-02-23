import { CompanyRole } from '@prisma/client';
export declare class CreateCompanyDto {
    name: string;
    eik: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    countryId?: string;
    settlementId?: string;
    molName?: string;
    phone?: string;
    email?: string;
    website?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    currencyId?: string;
    pushNotificationsEnabled?: boolean;
    role?: CompanyRole;
    isActive?: boolean;
}
