import { SettlementsService } from './settlements.service';
import { SettlementType } from '@prisma/client';
export declare class SettlementsController {
    private readonly settlementsService;
    constructor(settlementsService: SettlementsService);
    findAll(countryId?: string, region?: string, municipality?: string, type?: SettlementType, search?: string, isActive?: string, limit?: string): Promise<({
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
    getRegions(countryId: string): Promise<string[]>;
    getMunicipalities(countryId: string, region?: string): Promise<string[]>;
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
}
