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
exports.SettlementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettlementsService = class SettlementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { countryId, region, municipality, type, search, isActive, limit = 100, } = params || {};
        return this.prisma.settlement.findMany({
            where: {
                ...(countryId && { countryId }),
                ...(region && { region }),
                ...(municipality && { municipality }),
                ...(type && { type }),
                ...(isActive !== undefined && { isActive }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { postalCode: { contains: search, mode: 'insensitive' } },
                    ],
                }),
            },
            include: {
                country: true,
            },
            orderBy: [
                { type: 'asc' },
                { name: 'asc' },
            ],
            take: limit,
        });
    }
    async findOne(id) {
        return this.prisma.settlement.findUnique({
            where: { id },
            include: {
                country: true,
            },
        });
    }
    async findByEkatte(ekatte) {
        return this.prisma.settlement.findUnique({
            where: { ekatte },
            include: {
                country: true,
            },
        });
    }
    async getRegions(countryId) {
        const results = await this.prisma.settlement.findMany({
            where: { countryId, isActive: true },
            select: { region: true },
            distinct: ['region'],
            orderBy: { region: 'asc' },
        });
        return results.map((r) => r.region).filter((r) => r !== null);
    }
    async getMunicipalities(countryId, region) {
        const results = await this.prisma.settlement.findMany({
            where: {
                countryId,
                isActive: true,
                ...(region && { region }),
            },
            select: { municipality: true },
            distinct: ['municipality'],
            orderBy: { municipality: 'asc' },
        });
        return results
            .map((r) => r.municipality)
            .filter((r) => r !== null);
    }
};
exports.SettlementsService = SettlementsService;
exports.SettlementsService = SettlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettlementsService);
//# sourceMappingURL=settlements.service.js.map