import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto, QueryLocationsDto, CreateStorageZoneDto, UpdateStorageZoneDto } from './dto';
export declare class LocationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateLocationDto): Promise<{
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
    findAll(companyId: string, query: QueryLocationsDto): Promise<{
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
    findOne(companyId: string, id: string): Promise<{
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
    update(companyId: string, id: string, dto: UpdateLocationDto): Promise<{
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
    remove(companyId: string, id: string): Promise<{
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
    createStorageZone(companyId: string, locationId: string, dto: CreateStorageZoneDto): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
    findAllStorageZones(companyId: string, locationId: string): Promise<({
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
    findOneStorageZone(companyId: string, locationId: string, zoneId: string): Promise<{
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
    updateStorageZone(companyId: string, locationId: string, zoneId: string, dto: UpdateStorageZoneDto): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        locationId: string;
    }>;
    removeStorageZone(companyId: string, locationId: string, zoneId: string): Promise<{
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
