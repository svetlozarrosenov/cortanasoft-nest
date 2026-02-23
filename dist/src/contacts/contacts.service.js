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
exports.ContactsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ContactsService = class ContactsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        const customer = await this.prisma.customer.findFirst({
            where: {
                id: dto.customerId,
                companyId,
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        if (dto.isPrimary) {
            await this.prisma.contact.updateMany({
                where: {
                    customerId: dto.customerId,
                    isPrimary: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        return this.prisma.contact.create({
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                jobTitle: dto.jobTitle,
                department: dto.department,
                email: dto.email,
                phone: dto.phone,
                mobile: dto.mobile,
                linkedIn: dto.linkedIn,
                skype: dto.skype,
                notes: dto.notes,
                isPrimary: dto.isPrimary ?? false,
                isActive: dto.isActive ?? true,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                customerId: dto.customerId,
                companyId,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        type: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, customerId, isActive, isPrimary, department, page = 1, limit = 20, sortBy = 'lastName', sortOrder = 'asc', } = query;
        const where = {
            companyId,
        };
        if (customerId) {
            where.customerId = customerId;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        if (isPrimary !== undefined) {
            where.isPrimary = isPrimary;
        }
        if (department) {
            where.department = {
                contains: department,
                mode: 'insensitive',
            };
        }
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
                {
                    customer: {
                        OR: [
                            { companyName: { contains: search, mode: 'insensitive' } },
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }
        const allowedSortFields = [
            'firstName',
            'lastName',
            'email',
            'jobTitle',
            'department',
            'createdAt',
            'updatedAt',
        ];
        const orderByField = allowedSortFields.includes(sortBy)
            ? sortBy
            : 'lastName';
        const orderByDirection = sortOrder === 'desc' ? 'desc' : 'asc';
        const [data, total] = await Promise.all([
            this.prisma.contact.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            type: true,
                            companyName: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { [orderByField]: orderByDirection },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.contact.count({ where }),
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
        const contact = await this.prisma.contact.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        type: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });
        if (!contact) {
            throw new common_1.NotFoundException('Contact not found');
        }
        return contact;
    }
    async update(companyId, id, dto) {
        const existing = await this.prisma.contact.findFirst({
            where: {
                id,
                companyId,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Contact not found');
        }
        if (dto.isPrimary === true) {
            await this.prisma.contact.updateMany({
                where: {
                    customerId: existing.customerId,
                    isPrimary: true,
                    id: { not: id },
                },
                data: {
                    isPrimary: false,
                },
            });
        }
        return this.prisma.contact.update({
            where: { id },
            data: {
                ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
                ...(dto.department !== undefined && { department: dto.department }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.mobile !== undefined && { mobile: dto.mobile }),
                ...(dto.linkedIn !== undefined && { linkedIn: dto.linkedIn }),
                ...(dto.skype !== undefined && { skype: dto.skype }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.birthDate !== undefined && {
                    birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                }),
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        type: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        const contact = await this.prisma.contact.findFirst({
            where: {
                id,
                companyId,
            },
        });
        if (!contact) {
            throw new common_1.NotFoundException('Contact not found');
        }
        await this.prisma.contact.delete({
            where: { id },
        });
        return { message: 'Contact deleted successfully' };
    }
    async setAsPrimary(companyId, id) {
        const contact = await this.prisma.contact.findFirst({
            where: {
                id,
                companyId,
            },
        });
        if (!contact) {
            throw new common_1.NotFoundException('Contact not found');
        }
        await this.prisma.contact.updateMany({
            where: {
                customerId: contact.customerId,
                isPrimary: true,
                id: { not: id },
            },
            data: {
                isPrimary: false,
            },
        });
        return this.prisma.contact.update({
            where: { id },
            data: { isPrimary: true },
            include: {
                customer: {
                    select: {
                        id: true,
                        type: true,
                        companyName: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async findByCustomer(companyId, customerId) {
        const customer = await this.prisma.customer.findFirst({
            where: {
                id: customerId,
                companyId,
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        return this.prisma.contact.findMany({
            where: {
                customerId,
                companyId,
            },
            orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
        });
    }
};
exports.ContactsService = ContactsService;
exports.ContactsService = ContactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContactsService);
//# sourceMappingURL=contacts.service.js.map