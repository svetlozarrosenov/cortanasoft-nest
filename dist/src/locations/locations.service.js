"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LocationsService = class LocationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const existingLocation = await this.prisma.location.findUnique({
            where: {
                companyId_code: {
                    companyId,
                    code: dto.code,
                },
            },
        });
        if (existingLocation) {
            throw new common_1.ConflictException(`Локация с код "${dto.code}" вече съществува`);
        }
        if (dto.isDefault) {
            await this.prisma.location.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false },
            });
        }
        return this.prisma.location.create({
            data: {
                ...dto,
                companyId,
            },
            include: {
                storageZones: true,
                _count: {
                    select: {
                        inventoryBatches: true,
                        inventorySerials: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, type, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type) {
            where.type = type;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const [locations, total] = await Promise.all([
            this.prisma.location.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    storageZones: {
                        where: { isActive: true },
                        orderBy: { code: 'asc' },
                    },
                    _count: {
                        select: {
                            inventoryBatches: true,
                            inventorySerials: true,
                            storageZones: true,
                        },
                    },
                },
            }),
            this.prisma.location.count({ where }),
        ]);
        return {
            data: locations,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const location = await this.prisma.location.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                storageZones: {
                    orderBy: { code: 'asc' },
                },
                _count: {
                    select: {
                        inventoryBatches: true,
                        inventorySerials: true,
                        goodsReceipts: true,
                    },
                },
            },
        });
        if (!location) {
            throw new common_1.NotFoundException('Локацията не е намерена');
        }
        return location;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        if (dto.code) {
            const existingLocation = await this.prisma.location.findFirst({
                where: {
                    companyId,
                    code: dto.code,
                    NOT: { id },
                },
            });
            if (existingLocation) {
                throw new common_1.ConflictException(`Локация с код "${dto.code}" вече съществува`);
            }
        }
        if (dto.isDefault) {
            await this.prisma.location.updateMany({
                where: { companyId, isDefault: true, NOT: { id } },
                data: { isDefault: false },
            });
        }
        return this.prisma.location.update({
            where: { id },
            data: dto,
            include: {
                storageZones: true,
                _count: {
                    select: {
                        inventoryBatches: true,
                        inventorySerials: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        const location = await this.findOne(companyId, id);
        if (location._count.inventoryBatches > 0 ||
            location._count.inventorySerials > 0) {
            throw new common_1.ConflictException('Не може да изтриете локация с налични продукти');
        }
        return this.prisma.location.delete({
            where: { id },
        });
    }
    async createStorageZone(companyId, locationId, dto) {
        await this.findOne(companyId, locationId);
        const existingZone = await this.prisma.storageZone.findUnique({
            where: {
                locationId_code: {
                    locationId,
                    code: dto.code,
                },
            },
        });
        if (existingZone) {
            throw new common_1.ConflictException(`Зона с код "${dto.code}" вече съществува в тази локация`);
        }
        return this.prisma.storageZone.create({
            data: {
                ...dto,
                locationId,
            },
        });
    }
    async findAllStorageZones(companyId, locationId) {
        await this.findOne(companyId, locationId);
        return this.prisma.storageZone.findMany({
            where: { locationId },
            orderBy: { code: 'asc' },
            include: {
                _count: {
                    select: {
                        inventoryBatches: true,
                        inventorySerials: true,
                    },
                },
            },
        });
    }
    async findOneStorageZone(companyId, locationId, zoneId) {
        await this.findOne(companyId, locationId);
        const zone = await this.prisma.storageZone.findFirst({
            where: {
                id: zoneId,
                locationId,
            },
            include: {
                _count: {
                    select: {
                        inventoryBatches: true,
                        inventorySerials: true,
                    },
                },
            },
        });
        if (!zone) {
            throw new common_1.NotFoundException('Зоната не е намерена');
        }
        return zone;
    }
    async updateStorageZone(companyId, locationId, zoneId, dto) {
        await this.findOneStorageZone(companyId, locationId, zoneId);
        if (dto.code) {
            const existingZone = await this.prisma.storageZone.findFirst({
                where: {
                    locationId,
                    code: dto.code,
                    NOT: { id: zoneId },
                },
            });
            if (existingZone) {
                throw new common_1.ConflictException(`Зона с код "${dto.code}" вече съществува в тази локация`);
            }
        }
        return this.prisma.storageZone.update({
            where: { id: zoneId },
            data: dto,
        });
    }
    async removeStorageZone(companyId, locationId, zoneId) {
        const zone = await this.findOneStorageZone(companyId, locationId, zoneId);
        if (zone._count.inventoryBatches > 0 || zone._count.inventorySerials > 0) {
            throw new common_1.ConflictException('Не може да изтриете зона с налични продукти');
        }
        return this.prisma.storageZone.delete({
            where: { id: zoneId },
        });
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map