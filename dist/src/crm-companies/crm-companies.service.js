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
exports.CrmCompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CrmCompaniesService = class CrmCompaniesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        if (dto.eik) {
            const existing = await this.prisma.crmCompany.findFirst({
                where: {
                    companyId,
                    eik: dto.eik,
                },
            });
            if (existing) {
                throw new common_1.ConflictException('A company with this EIK already exists');
            }
        }
        if (dto.countryId) {
            const country = await this.prisma.country.findUnique({
                where: { id: dto.countryId },
            });
            if (!country) {
                throw new common_1.NotFoundException('Country not found');
            }
        }
        return this.prisma.crmCompany.create({
            data: {
                name: dto.name,
                type: dto.type,
                industry: dto.industry,
                size: dto.size,
                eik: dto.eik,
                vatNumber: dto.vatNumber,
                email: dto.email,
                phone: dto.phone,
                website: dto.website,
                address: dto.address,
                city: dto.city,
                postalCode: dto.postalCode,
                countryId: dto.countryId,
                annualRevenue: dto.annualRevenue,
                employeeCount: dto.employeeCount,
                foundedYear: dto.foundedYear,
                linkedIn: dto.linkedIn,
                facebook: dto.facebook,
                twitter: dto.twitter,
                description: dto.description,
                notes: dto.notes,
                tags: dto.tags,
                isActive: dto.isActive ?? true,
                companyId,
            },
            include: {
                country: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        crmContacts: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, type, industry, size, isActive, city, countryId, tags, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', } = query;
        const where = {
            companyId,
        };
        if (type) {
            where.type = type;
        }
        if (industry) {
            where.industry = industry;
        }
        if (size) {
            where.size = size;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (city) {
            where.city = {
                contains: city,
                mode: 'insensitive',
            };
        }
        if (countryId) {
            where.countryId = countryId;
        }
        if (tags) {
            where.tags = {
                contains: tags,
                mode: 'insensitive',
            };
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { eik: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { contains: search, mode: 'insensitive' } },
            ];
        }
        const allowedSortFields = [
            'name',
            'type',
            'industry',
            'city',
            'annualRevenue',
            'employeeCount',
            'createdAt',
            'updatedAt',
        ];
        const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
        const orderByDirection = sortOrder === 'desc' ? 'desc' : 'asc';
        const [data, total] = await Promise.all([
            this.prisma.crmCompany.findMany({
                where,
                include: {
                    country: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            crmContacts: true,
                        },
                    },
                },
                orderBy: { [orderByField]: orderByDirection },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.crmCompany.count({ where }),
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
        const crmCompany = await this.prisma.crmCompany.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                country: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                crmContacts: {
                    orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
                },
                _count: {
                    select: {
                        crmContacts: true,
                    },
                },
            },
        });
        if (!crmCompany) {
            throw new common_1.NotFoundException('CRM Company not found');
        }
        return crmCompany;
    }
    async update(companyId, id, dto) {
        const existing = await this.prisma.crmCompany.findFirst({
            where: {
                id,
                companyId,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('CRM Company not found');
        }
        if (dto.eik && dto.eik !== existing.eik) {
            const eikExists = await this.prisma.crmCompany.findFirst({
                where: {
                    companyId,
                    eik: dto.eik,
                    id: { not: id },
                },
            });
            if (eikExists) {
                throw new common_1.ConflictException('A company with this EIK already exists');
            }
        }
        if (dto.countryId) {
            const country = await this.prisma.country.findUnique({
                where: { id: dto.countryId },
            });
            if (!country) {
                throw new common_1.NotFoundException('Country not found');
            }
        }
        return this.prisma.crmCompany.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.industry !== undefined && { industry: dto.industry }),
                ...(dto.size !== undefined && { size: dto.size }),
                ...(dto.eik !== undefined && { eik: dto.eik }),
                ...(dto.vatNumber !== undefined && { vatNumber: dto.vatNumber }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.website !== undefined && { website: dto.website }),
                ...(dto.address !== undefined && { address: dto.address }),
                ...(dto.city !== undefined && { city: dto.city }),
                ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
                ...(dto.countryId !== undefined && { countryId: dto.countryId }),
                ...(dto.annualRevenue !== undefined && {
                    annualRevenue: dto.annualRevenue,
                }),
                ...(dto.employeeCount !== undefined && {
                    employeeCount: dto.employeeCount,
                }),
                ...(dto.foundedYear !== undefined && { foundedYear: dto.foundedYear }),
                ...(dto.linkedIn !== undefined && { linkedIn: dto.linkedIn }),
                ...(dto.facebook !== undefined && { facebook: dto.facebook }),
                ...(dto.twitter !== undefined && { twitter: dto.twitter }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.tags !== undefined && { tags: dto.tags }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: {
                country: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        crmContacts: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        const crmCompany = await this.prisma.crmCompany.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                _count: {
                    select: {
                        crmContacts: true,
                    },
                },
            },
        });
        if (!crmCompany) {
            throw new common_1.NotFoundException('CRM Company not found');
        }
        await this.prisma.crmCompany.delete({
            where: { id },
        });
        return { message: 'CRM Company deleted successfully' };
    }
    async getIndustries() {
        return [
            'TECHNOLOGY',
            'FINANCE',
            'HEALTHCARE',
            'MANUFACTURING',
            'RETAIL',
            'REAL_ESTATE',
            'EDUCATION',
            'CONSULTING',
            'LOGISTICS',
            'HOSPITALITY',
            'CONSTRUCTION',
            'AGRICULTURE',
            'ENERGY',
            'MEDIA',
            'OTHER',
        ];
    }
    async getTypes() {
        return ['PROSPECT', 'CUSTOMER', 'PARTNER', 'VENDOR', 'COMPETITOR', 'OTHER'];
    }
    async getSizes() {
        return ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'];
    }
};
exports.CrmCompaniesService = CrmCompaniesService;
exports.CrmCompaniesService = CrmCompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmCompaniesService);
//# sourceMappingURL=crm-companies.service.js.map