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
exports.DealsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DealsService = class DealsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto, userId) {
        let currencyId = dto.currencyId;
        if (!currencyId) {
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                select: { currencyId: true },
            });
            currencyId = company?.currencyId || undefined;
        }
        return this.prisma.deal.create({
            data: {
                ...dto,
                currencyId,
                expectedCloseDate: dto.expectedCloseDate
                    ? new Date(dto.expectedCloseDate)
                    : undefined,
                companyId,
                createdById: userId,
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
                currency: true,
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
        const { search, status, customerId, assignedToId, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(status && { status }),
            ...(customerId && { customerId }),
            ...(assignedToId && { assignedToId }),
            ...(isActive !== undefined && { isActive }),
        };
        const [items, total] = await Promise.all([
            this.prisma.deal.findMany({
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
                    currency: true,
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
            this.prisma.deal.count({ where }),
        ]);
        return {
            items,
            data: items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(companyId, id) {
        const deal = await this.prisma.deal.findFirst({
            where: { id, companyId },
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
                currency: true,
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
        if (!deal) {
            throw new common_1.NotFoundException('Deal not found');
        }
        return deal;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        return this.prisma.deal.update({
            where: { id },
            data: {
                ...dto,
                expectedCloseDate: dto.expectedCloseDate
                    ? new Date(dto.expectedCloseDate)
                    : undefined,
                actualCloseDate: dto.actualCloseDate
                    ? new Date(dto.actualCloseDate)
                    : undefined,
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
                currency: true,
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
        return this.prisma.deal.delete({
            where: { id },
        });
    }
    async updateStatus(companyId, id, status, lostReason) {
        await this.findOne(companyId, id);
        const data = {
            status,
        };
        if (status === client_1.DealStatus.CLOSED_WON || status === client_1.DealStatus.CLOSED_LOST) {
            data.actualCloseDate = new Date();
        }
        if (status === client_1.DealStatus.CLOSED_LOST && lostReason) {
            data.lostReason = lostReason;
        }
        return this.prisma.deal.update({
            where: { id },
            data,
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
                currency: true,
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
    getStatuses() {
        return Object.values(client_1.DealStatus);
    }
    async getStatistics(companyId) {
        const [totalDeals, openDeals, wonDeals, lostDeals, totalValue, wonValue] = await Promise.all([
            this.prisma.deal.count({ where: { companyId, isActive: true } }),
            this.prisma.deal.count({
                where: {
                    companyId,
                    isActive: true,
                    status: {
                        notIn: [client_1.DealStatus.CLOSED_WON, client_1.DealStatus.CLOSED_LOST],
                    },
                },
            }),
            this.prisma.deal.count({
                where: { companyId, status: client_1.DealStatus.CLOSED_WON },
            }),
            this.prisma.deal.count({
                where: { companyId, status: client_1.DealStatus.CLOSED_LOST },
            }),
            this.prisma.deal.aggregate({
                where: {
                    companyId,
                    isActive: true,
                    status: {
                        notIn: [client_1.DealStatus.CLOSED_WON, client_1.DealStatus.CLOSED_LOST],
                    },
                },
                _sum: { amount: true },
            }),
            this.prisma.deal.aggregate({
                where: { companyId, status: client_1.DealStatus.CLOSED_WON },
                _sum: { amount: true },
            }),
        ]);
        return {
            totalDeals,
            openDeals,
            wonDeals,
            lostDeals,
            totalPipelineValue: totalValue._sum.amount || 0,
            totalWonValue: wonValue._sum.amount || 0,
            winRate: totalDeals > 0
                ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) || 0
                : 0,
        };
    }
};
exports.DealsService = DealsService;
exports.DealsService = DealsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DealsService);
//# sourceMappingURL=deals.service.js.map