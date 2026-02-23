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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let LeadsService = class LeadsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto, userId) {
        return this.prisma.lead.create({
            data: {
                ...dto,
                nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : undefined,
                companyId,
                createdById: userId,
            },
            include: {
                country: true,
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, status, source, assignedToId, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(status && { status }),
            ...(source && { source }),
            ...(assignedToId && { assignedToId }),
            ...(isActive !== undefined && { isActive }),
        };
        const [items, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                include: {
                    country: true,
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.lead.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(companyId, id) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, companyId },
            include: {
                country: true,
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        return lead;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        return this.prisma.lead.update({
            where: { id },
            data: {
                ...dto,
                nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : undefined,
                convertedAt: dto.convertedAt ? new Date(dto.convertedAt) : undefined,
            },
            include: {
                country: true,
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.lead.delete({
            where: { id },
        });
    }
    async convertToCustomer(companyId, id) {
        const lead = await this.findOne(companyId, id);
        const isCompanyType = !!lead.companyName;
        const customer = await this.prisma.customer.create({
            data: {
                type: isCompanyType ? 'COMPANY' : 'INDIVIDUAL',
                companyName: lead.companyName || undefined,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                mobile: lead.mobile,
                address: lead.address,
                city: lead.city,
                countryId: lead.countryId,
                notes: lead.notes,
                companyId,
            },
        });
        await this.prisma.lead.update({
            where: { id },
            data: {
                status: client_1.LeadStatus.CONVERTED,
                convertedAt: new Date(),
                convertedToCustomerId: customer.id,
            },
        });
        return customer;
    }
    async convertToCrmCompany(companyId, id) {
        const lead = await this.findOne(companyId, id);
        const crmCompany = await this.prisma.crmCompany.create({
            data: {
                name: lead.companyName || `${lead.firstName} ${lead.lastName}`,
                email: lead.email,
                phone: lead.phone,
                address: lead.address,
                city: lead.city,
                countryId: lead.countryId,
                description: lead.description,
                companyId,
            },
        });
        await this.prisma.lead.update({
            where: { id },
            data: {
                status: client_1.LeadStatus.CONVERTED,
                convertedAt: new Date(),
                convertedToCrmCompanyId: crmCompany.id,
            },
        });
        return crmCompany;
    }
    getStatuses() {
        return Object.values(client_1.LeadStatus);
    }
    getSources() {
        const { LeadSource } = require('@prisma/client');
        return Object.values(LeadSource);
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map