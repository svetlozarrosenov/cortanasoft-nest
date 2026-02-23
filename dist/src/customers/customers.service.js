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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const error_messages_1 = require("../common/constants/error-messages");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const type = dto.type || client_1.CustomerType.INDIVIDUAL;
        if (type === client_1.CustomerType.COMPANY && !dto.companyName) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.customers.companyNameRequired);
        }
        if (type === client_1.CustomerType.INDIVIDUAL && !dto.firstName && !dto.lastName) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.customers.personalNameRequired);
        }
        if (dto.eik) {
            const existing = await this.prisma.customer.findFirst({
                where: { companyId, eik: dto.eik },
            });
            if (existing) {
                throw new common_1.BadRequestException(error_messages_1.ErrorMessages.customers.eikExists);
            }
        }
        if (dto.countryId) {
            const country = await this.prisma.country.findUnique({
                where: { id: dto.countryId },
            });
            if (!country) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.customers.countryNotFound);
            }
        }
        return this.prisma.customer.create({
            data: {
                type,
                companyName: dto.companyName,
                eik: dto.eik,
                vatNumber: dto.vatNumber,
                molName: dto.molName,
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                mobile: dto.mobile,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                countryId: dto.countryId,
                bankName: dto.bankName,
                iban: dto.iban,
                bic: dto.bic,
                notes: dto.notes,
                creditLimit: dto.creditLimit,
                discount: dto.discount,
                isActive: dto.isActive ?? true,
                stage: dto.stage,
                source: dto.source,
                industry: dto.industry,
                size: dto.size,
                website: dto.website,
                description: dto.description,
                tags: dto.tags,
                assignedToId: dto.assignedToId,
                companyId,
            },
            include: {
                country: true,
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { orders: true } },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, type, isActive, stage, source, createdFrom, createdTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(type && { type }),
            ...(isActive !== undefined && { isActive }),
            ...(stage && { stage }),
            ...(source && { source }),
            ...(createdFrom || createdTo
                ? {
                    createdAt: {
                        ...(createdFrom && { gte: new Date(createdFrom) }),
                        ...(createdTo && { lte: new Date(createdTo + 'T23:59:59.999Z') }),
                    },
                }
                : {}),
            ...(search && {
                OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                    { eik: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                include: {
                    country: true,
                    assignedTo: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { orders: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.customer.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, companyId },
            include: {
                country: true,
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        orderNumber: true,
                        orderDate: true,
                        status: true,
                        total: true,
                    },
                },
                _count: { select: { orders: true } },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.customers.notFound);
        }
        return customer;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        if (dto.eik) {
            const existing = await this.prisma.customer.findFirst({
                where: { companyId, eik: dto.eik, NOT: { id } },
            });
            if (existing) {
                throw new common_1.BadRequestException(error_messages_1.ErrorMessages.customers.eikExists);
            }
        }
        if (dto.countryId) {
            const country = await this.prisma.country.findUnique({
                where: { id: dto.countryId },
            });
            if (!country) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.customers.countryNotFound);
            }
        }
        return this.prisma.customer.update({
            where: { id },
            data: {
                ...(dto.type && { type: dto.type }),
                ...(dto.companyName !== undefined && { companyName: dto.companyName }),
                ...(dto.eik !== undefined && { eik: dto.eik }),
                ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
                ...(dto.molName !== undefined && { molName: dto.molName }),
                ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.mobile !== undefined && { mobile: dto.mobile }),
                ...(dto.address !== undefined && { address: dto.address }),
                ...(dto.city !== undefined && { city: dto.city }),
                ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
                ...(dto.countryId !== undefined && { countryId: dto.countryId }),
                ...(dto.bankName !== undefined && { bankName: dto.bankName }),
                ...(dto.iban !== undefined && { iban: dto.iban }),
                ...(dto.bic !== undefined && { bic: dto.bic }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
                ...(dto.discount !== undefined && { discount: dto.discount }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: {
                country: true,
                _count: { select: { orders: true } },
            },
        });
    }
    async remove(companyId, id) {
        const customer = await this.findOne(companyId, id);
        if (customer._count.orders > 0) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.customers.cannotDeleteWithOrders);
        }
        await this.prisma.customer.delete({ where: { id } });
        return { message: 'Customer deleted successfully' };
    }
    getDisplayName(customer) {
        if (customer.type === client_1.CustomerType.COMPANY) {
            return customer.companyName || 'Unnamed Company';
        }
        const parts = [customer.firstName, customer.lastName].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : 'Unnamed Customer';
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map