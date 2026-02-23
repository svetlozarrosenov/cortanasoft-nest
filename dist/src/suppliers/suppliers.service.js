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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SuppliersService = class SuppliersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        if (dto.eik) {
            const existingSupplier = await this.prisma.supplier.findUnique({
                where: {
                    companyId_eik: {
                        companyId,
                        eik: dto.eik,
                    },
                },
            });
            if (existingSupplier) {
                throw new common_1.ConflictException(`Доставчик с ЕИК "${dto.eik}" вече съществува`);
            }
        }
        return this.prisma.supplier.create({
            data: {
                ...dto,
                companyId,
            },
        });
    }
    async findAll(companyId, query) {
        const { search, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { eik: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const [suppliers, total] = await Promise.all([
            this.prisma.supplier.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.supplier.count({ where }),
        ]);
        return {
            data: suppliers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const supplier = await this.prisma.supplier.findFirst({
            where: {
                id,
                companyId,
            },
        });
        if (!supplier) {
            throw new common_1.NotFoundException('Доставчикът не е намерен');
        }
        return supplier;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        if (dto.eik) {
            const existingSupplier = await this.prisma.supplier.findFirst({
                where: {
                    companyId,
                    eik: dto.eik,
                    NOT: { id },
                },
            });
            if (existingSupplier) {
                throw new common_1.ConflictException(`Доставчик с ЕИК "${dto.eik}" вече съществува`);
            }
        }
        return this.prisma.supplier.update({
            where: { id },
            data: dto,
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.supplier.delete({
            where: { id },
        });
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map