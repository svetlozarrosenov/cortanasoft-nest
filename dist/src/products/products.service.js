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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, userId, dto) {
        const existingProduct = await this.prisma.product.findUnique({
            where: {
                companyId_sku: {
                    companyId,
                    sku: dto.sku,
                },
            },
        });
        if (existingProduct) {
            throw new common_1.ConflictException(`Продукт с артикулен номер "${dto.sku}" вече съществува`);
        }
        if (dto.categoryId) {
            const category = await this.prisma.productCategory.findFirst({
                where: {
                    id: dto.categoryId,
                    companyId,
                },
            });
            if (!category) {
                throw new common_1.NotFoundException('Категорията не е намерена');
            }
        }
        if (dto.vatRate === undefined || !dto.purchaseCurrencyId || !dto.saleCurrencyId) {
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                select: { vatNumber: true, currencyId: true },
            });
            if (dto.vatRate === undefined) {
                dto.vatRate = company?.vatNumber ? 20 : 0;
            }
            if (!dto.purchaseCurrencyId && company?.currencyId) {
                dto.purchaseCurrencyId = company.currencyId;
            }
            if (!dto.saleCurrencyId && company?.currencyId) {
                dto.saleCurrencyId = company.currencyId;
            }
        }
        return this.prisma.product.create({
            data: {
                ...dto,
                companyId,
                createdById: userId,
            },
            include: {
                category: true,
                purchaseCurrency: true,
                saleCurrency: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, type, categoryId, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type) {
            where.type = type;
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                include: {
                    category: true,
                    purchaseCurrency: true,
                    saleCurrency: true,
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const product = await this.prisma.product.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                category: true,
                purchaseCurrency: true,
                saleCurrency: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Продуктът не е намерен');
        }
        return product;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        if (dto.sku) {
            const existingProduct = await this.prisma.product.findFirst({
                where: {
                    companyId,
                    sku: dto.sku,
                    NOT: { id },
                },
            });
            if (existingProduct) {
                throw new common_1.ConflictException(`Продукт с артикулен номер "${dto.sku}" вече съществува`);
            }
        }
        if (dto.categoryId) {
            const category = await this.prisma.productCategory.findFirst({
                where: {
                    id: dto.categoryId,
                    companyId,
                },
            });
            if (!category) {
                throw new common_1.NotFoundException('Категорията не е намерена');
            }
        }
        return this.prisma.product.update({
            where: { id },
            data: dto,
            include: {
                category: true,
                purchaseCurrency: true,
                saleCurrency: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.product.delete({
            where: { id },
        });
    }
    async findAllCategories(companyId) {
        return this.prisma.productCategory.findMany({
            where: { companyId },
            include: {
                parent: true,
                children: true,
                _count: {
                    select: { products: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createCategory(companyId, data) {
        const existing = await this.prisma.productCategory.findUnique({
            where: {
                companyId_name: {
                    companyId,
                    name: data.name,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Категория "${data.name}" вече съществува`);
        }
        return this.prisma.productCategory.create({
            data: {
                name: data.name,
                description: data.description || null,
                parentId: data.parentId || null,
                companyId,
            },
            include: {
                parent: true,
                children: true,
            },
        });
    }
    async updateCategory(companyId, id, data) {
        const category = await this.prisma.productCategory.findFirst({
            where: { id, companyId },
        });
        if (!category) {
            throw new common_1.NotFoundException('Категорията не е намерена');
        }
        if (data.name && data.name !== category.name) {
            const existing = await this.prisma.productCategory.findFirst({
                where: {
                    companyId,
                    name: data.name,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException(`Категория "${data.name}" вече съществува`);
            }
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.description !== undefined)
            updateData.description = data.description || null;
        if (data.parentId !== undefined)
            updateData.parentId = data.parentId || null;
        return this.prisma.productCategory.update({
            where: { id },
            data: updateData,
            include: {
                parent: true,
                children: true,
            },
        });
    }
    async removeCategory(companyId, id) {
        const category = await this.prisma.productCategory.findFirst({
            where: { id, companyId },
            include: {
                _count: { select: { products: true, children: true } },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Категорията не е намерена');
        }
        if (category._count.products > 0) {
            throw new common_1.ConflictException('Не може да изтриете категория с продукти');
        }
        if (category._count.children > 0) {
            throw new common_1.ConflictException('Не може да изтриете категория с подкатегории');
        }
        return this.prisma.productCategory.delete({
            where: { id },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map