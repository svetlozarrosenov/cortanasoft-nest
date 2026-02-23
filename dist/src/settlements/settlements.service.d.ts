import { PrismaService } from '../prisma/prisma.service';
import { SettlementType } from '@prisma/client';
export declare class SettlementsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(params?: {
        countryId?: string;
        region?: string;
        municipality?: string;
        type?: SettlementType;
        search?: string;
        isActive?: boolean;
        limit?: number;
    }): Promise<({
        country: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        ekatte: string | null;
        type: import(".prisma/client").$Enums.SettlementType;
        postalCode: string | null;
        municipality: string | null;
        region: string | null;
        countryId: string;
    })[]>;
    findOne(id: string): Promise<({
        country: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        ekatte: string | null;
        type: import(".prisma/client").$Enums.SettlementType;
        postalCode: string | null;
        municipality: string | null;
        region: string | null;
        countryId: string;
    }) | null>;
    findByEkatte(ekatte: string): Promise<({
        country: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            nativeName: string | null;
            phoneCode: string | null;
            isEU: boolean;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        ekatte: string | null;
        type: import(".prisma/client").$Enums.SettlementType;
        postalCode: string | null;
        municipality: string | null;
        region: string | null;
        countryId: string;
    }) | null>;
    getRegions(countryId: string): Promise<string[]>;
    getMunicipalities(countryId: string, region?: string): Promise<string[]>;
}
