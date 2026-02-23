import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, QueryLocationsDto, CreateStorageZoneDto, UpdateStorageZoneDto } from './dto';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(user: any, dto: CreateLocationDto): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            locationId: string;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LocationType;
        address: string | null;
        description: string | null;
        isDefault: boolean;
        companyId: string;
    }>;
    findAll(user: any, query: QueryLocationsDto): Promise<{
        data: ({
            _count: {
                inventoryBatches: number;
                inventorySerials: number;
                storageZones: number;
            };
            storageZones: {
                id: string;
                code: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                locationId: string;
            }[];
        } & {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.LocationType;
            address: string | null;
            description: string | null;
            isDefault: boolean;
            companyId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(user: any, id: string): Promise<{
        _count: {
            goodsReceipts: number;
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            locationId: string;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LocationType;
        address: string | null;
        description: string | null;
        isDefault: boolean;
        companyId: string;
    }>;
    update(user: any, id: string, dto: UpdateLocationDto): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
        storageZones: {
            id: string;
            code: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            locationId: string;
        }[];
    } & {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LocationType;
        address: string | null;
        description: string | null;
        isDefault: boolean;
        companyId: string;
    }>;
    remove(user: any, id: string): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.LocationType;
        address: string | null;
        description: string | null;
        isDefault: boolean;
        companyId: string;
    }>;
    createStorageZone(user: any, locationId: string, dto: CreateStorageZoneDto): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
    findAllStorageZones(user: any, locationId: string): Promise<({
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
    } & {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    })[]>;
    findOneStorageZone(user: any, locationId: string, zoneId: string): Promise<{
        _count: {
            inventoryBatches: number;
            inventorySerials: number;
        };
    } & {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
    updateStorageZone(user: any, locationId: string, zoneId: string, dto: UpdateStorageZoneDto): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
    removeStorageZone(user: any, locationId: string, zoneId: string): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
}
