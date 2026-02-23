import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, QueryLocationsDto, CreateStorageZoneDto, UpdateStorageZoneDto } from './dto';
export declare class CompanyLocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(companyId: string, dto: CreateLocationDto): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            name: string;
            createdAt: Date;
            description: string | null;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            locationId: string;
        }[];
    } & {
        name: string;
        type: import(".prisma/client").$Enums.LocationType;
        createdAt: Date;
        description: string | null;
        code: string;
        address: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        isActive: boolean;
        companyId: string;
    }>;
    findAll(companyId: string, query: QueryLocationsDto): Promise<{
        data: ({
            _count: {
                inventoryBatches: number;
                inventorySerials: number;
                storageZones: number;
            };
            storageZones: {
                name: string;
                createdAt: Date;
                description: string | null;
                code: string;
                updatedAt: Date;
                id: string;
                isActive: boolean;
                locationId: string;
            }[];
        } & {
            name: string;
            type: import(".prisma/client").$Enums.LocationType;
            createdAt: Date;
            description: string | null;
            code: string;
            address: string | null;
            updatedAt: Date;
            isDefault: boolean;
            id: string;
            isActive: boolean;
            companyId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        _count: {
            goodsReceipts: number;
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            name: string;
            createdAt: Date;
            description: string | null;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            locationId: string;
        }[];
    } & {
        name: string;
        type: import(".prisma/client").$Enums.LocationType;
        createdAt: Date;
        description: string | null;
        code: string;
        address: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        isActive: boolean;
        companyId: string;
    }>;
    update(companyId: string, id: string, dto: UpdateLocationDto): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            name: string;
            createdAt: Date;
            description: string | null;
            code: string;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            locationId: string;
        }[];
    } & {
        name: string;
        type: import(".prisma/client").$Enums.LocationType;
        createdAt: Date;
        description: string | null;
        code: string;
        address: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        isActive: boolean;
        companyId: string;
    }>;
    remove(companyId: string, id: string): Promise<{
        name: string;
        type: import(".prisma/client").$Enums.LocationType;
        createdAt: Date;
        description: string | null;
        code: string;
        address: string | null;
        updatedAt: Date;
        isDefault: boolean;
        id: string;
        isActive: boolean;
        companyId: string;
    }>;
    createStorageZone(companyId: string, locationId: string, dto: CreateStorageZoneDto): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        code: string;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        locationId: string;
    }>;
    findAllStorageZones(companyId: string, locationId: string): Promise<({
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        code: string;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        locationId: string;
    })[]>;
    findOneStorageZone(companyId: string, locationId: string, zoneId: string): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        code: string;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        locationId: string;
    }>;
    updateStorageZone(companyId: string, locationId: string, zoneId: string, dto: UpdateStorageZoneDto): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        code: string;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        locationId: string;
    }>;
    removeStorageZone(companyId: string, locationId: string, zoneId: string): Promise<{
        name: string;
        createdAt: Date;
        description: string | null;
        code: string;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        locationId: string;
    }>;
}
