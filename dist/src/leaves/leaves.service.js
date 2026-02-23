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
exports.LeavesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LeavesService = class LeavesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, userId, dto) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('End date cannot be before start date');
        }
        const overlapping = await this.prisma.leave.findFirst({
            where: {
                companyId,
                userId,
                status: { in: ['PENDING', 'APPROVED'] },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate },
                    },
                ],
            },
        });
        if (overlapping) {
            throw new common_1.BadRequestException('You already have a leave request for this period');
        }
        return this.prisma.leave.create({
            data: {
                type: dto.type,
                startDate,
                endDate,
                days: dto.days,
                reason: dto.reason,
                userId,
                companyId,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
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
        const { search, status, type, userId, startDate, endDate, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
        };
        if (status) {
            where.status = status;
        }
        if (type) {
            where.type = type;
        }
        if (userId) {
            where.userId = userId;
        }
        if (startDate) {
            where.startDate = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.endDate = { lte: new Date(endDate) };
        }
        if (search) {
            where.OR = [
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
                { reason: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [data, total] = await Promise.all([
            this.prisma.leave.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    approvedBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.leave.count({ where }),
        ]);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        return leave;
    }
    async update(companyId, id, userId, dto) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.userId !== userId) {
            throw new common_1.ForbiddenException('You can only update your own leave requests');
        }
        if (leave.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending leave requests can be updated');
        }
        const data = {};
        if (dto.type)
            data.type = dto.type;
        if (dto.startDate)
            data.startDate = new Date(dto.startDate);
        if (dto.endDate)
            data.endDate = new Date(dto.endDate);
        if (dto.days)
            data.days = dto.days;
        if (dto.reason !== undefined)
            data.reason = dto.reason;
        return this.prisma.leave.update({
            where: { id },
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async approve(companyId, id, approverId) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending leave requests can be approved');
        }
        const year = new Date(leave.startDate).getFullYear();
        if (leave.type === 'ANNUAL') {
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_companyId_year: {
                        userId: leave.userId,
                        companyId,
                        year,
                    },
                },
                update: {
                    annualUsed: { increment: leave.days },
                },
                create: {
                    userId: leave.userId,
                    companyId,
                    year,
                    annualTotal: 20,
                    annualUsed: leave.days,
                },
            });
        }
        else if (leave.type === 'SICK') {
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_companyId_year: {
                        userId: leave.userId,
                        companyId,
                        year,
                    },
                },
                update: {
                    sickUsed: { increment: leave.days },
                },
                create: {
                    userId: leave.userId,
                    companyId,
                    year,
                    sickUsed: leave.days,
                },
            });
        }
        else if (leave.type === 'UNPAID') {
            await this.prisma.leaveBalance.upsert({
                where: {
                    userId_companyId_year: {
                        userId: leave.userId,
                        companyId,
                        year,
                    },
                },
                update: {
                    unpaidUsed: { increment: leave.days },
                },
                create: {
                    userId: leave.userId,
                    companyId,
                    year,
                    unpaidUsed: leave.days,
                },
            });
        }
        return this.prisma.leave.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: approverId,
                approvedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async reject(companyId, id, approverId, dto) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending leave requests can be rejected');
        }
        return this.prisma.leave.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: approverId,
                approvedAt: new Date(),
                rejectionNote: dto.rejectionNote,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async cancel(companyId, id, userId) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.userId !== userId) {
            throw new common_1.ForbiddenException('You can only cancel your own leave requests');
        }
        if (!['PENDING', 'APPROVED'].includes(leave.status)) {
            throw new common_1.BadRequestException('This leave request cannot be cancelled');
        }
        if (leave.status === 'APPROVED') {
            const year = new Date(leave.startDate).getFullYear();
            if (leave.type === 'ANNUAL') {
                await this.prisma.leaveBalance.update({
                    where: {
                        userId_companyId_year: {
                            userId: leave.userId,
                            companyId,
                            year,
                        },
                    },
                    data: {
                        annualUsed: { decrement: leave.days },
                    },
                });
            }
            else if (leave.type === 'SICK') {
                await this.prisma.leaveBalance.update({
                    where: {
                        userId_companyId_year: {
                            userId: leave.userId,
                            companyId,
                            year,
                        },
                    },
                    data: {
                        sickUsed: { decrement: leave.days },
                    },
                });
            }
            else if (leave.type === 'UNPAID') {
                await this.prisma.leaveBalance.update({
                    where: {
                        userId_companyId_year: {
                            userId: leave.userId,
                            companyId,
                            year,
                        },
                    },
                    data: {
                        unpaidUsed: { decrement: leave.days },
                    },
                });
            }
        }
        return this.prisma.leave.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id, userId) {
        const leave = await this.prisma.leave.findFirst({
            where: { id, companyId },
        });
        if (!leave) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        if (leave.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own leave requests');
        }
        if (leave.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending leave requests can be deleted');
        }
        await this.prisma.leave.delete({ where: { id } });
        return { success: true };
    }
    async getBalance(companyId, userId, year) {
        const targetYear = year || new Date().getFullYear();
        let balance = await this.prisma.leaveBalance.findUnique({
            where: {
                userId_companyId_year: {
                    userId,
                    companyId,
                    year: targetYear,
                },
            },
        });
        if (!balance) {
            balance = await this.prisma.leaveBalance.create({
                data: {
                    userId,
                    companyId,
                    year: targetYear,
                    annualTotal: 20,
                    annualUsed: 0,
                    annualCarried: 0,
                    sickTotal: 0,
                    sickUsed: 0,
                    unpaidUsed: 0,
                },
            });
        }
        return {
            year: targetYear,
            annual: {
                total: balance.annualTotal + balance.annualCarried,
                used: balance.annualUsed,
                remaining: balance.annualTotal + balance.annualCarried - balance.annualUsed,
                carried: balance.annualCarried,
            },
            sick: {
                used: balance.sickUsed,
            },
            unpaid: {
                used: balance.unpaidUsed,
            },
        };
    }
    async getMyLeaves(companyId, userId, query) {
        return this.findAll(companyId, { ...query, userId });
    }
    async getSummary(companyId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const [pending, approvedThisMonth, onLeaveToday] = await Promise.all([
            this.prisma.leave.count({
                where: { companyId, status: 'PENDING' },
            }),
            this.prisma.leave.count({
                where: {
                    companyId,
                    status: 'APPROVED',
                    approvedAt: { gte: startOfMonth, lte: endOfMonth },
                },
            }),
            this.prisma.leave.count({
                where: {
                    companyId,
                    status: 'APPROVED',
                    startDate: { lte: now },
                    endDate: { gte: now },
                },
            }),
        ]);
        return {
            pending,
            approvedThisMonth,
            onLeaveToday,
        };
    }
};
exports.LeavesService = LeavesService;
exports.LeavesService = LeavesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeavesService);
//# sourceMappingURL=leaves.service.js.map