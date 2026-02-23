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
exports.CallsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CallsService = class CallsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    callInclude = {
        customer: {
            select: {
                id: true,
                type: true,
                companyName: true,
                firstName: true,
                lastName: true,
                phone: true,
                mobile: true,
            },
        },
        contact: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                mobile: true,
                email: true,
            },
        },
        lead: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                phone: true,
                mobile: true,
            },
        },
        deal: {
            select: {
                id: true,
                name: true,
                status: true,
                amount: true,
            },
        },
        crmCompany: {
            select: {
                id: true,
                name: true,
                phone: true,
            },
        },
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
            },
        },
    };
    async create(companyId, userId, dto) {
        return this.prisma.call.create({
            data: {
                subject: dto.subject,
                direction: dto.direction || 'OUTBOUND',
                outcome: dto.outcome,
                phoneNumber: dto.phoneNumber,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
                startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
                endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
                duration: dto.duration,
                notes: dto.notes,
                followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
                followUpNotes: dto.followUpNotes,
                customerId: dto.customerId || undefined,
                contactId: dto.contactId || undefined,
                leadId: dto.leadId || undefined,
                dealId: dto.dealId || undefined,
                crmCompanyId: dto.crmCompanyId || undefined,
                assignedToId: dto.assignedToId || userId,
                companyId,
                createdById: userId,
            },
            include: this.callInclude,
        });
    }
    async findAll(companyId, query) {
        const { search, direction, outcome, customerId, contactId, leadId, dealId, crmCompanyId, assignedToId, dateFrom, dateTo, scheduled, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(isActive !== undefined && { isActive }),
            ...(direction && { direction }),
            ...(outcome && { outcome }),
            ...(customerId && { customerId }),
            ...(contactId && { contactId }),
            ...(leadId && { leadId }),
            ...(dealId && { dealId }),
            ...(crmCompanyId && { crmCompanyId }),
            ...(assignedToId && { assignedToId }),
            ...(scheduled !== undefined && {
                scheduledAt: scheduled ? { not: null, gte: new Date() } : null,
            }),
            ...(dateFrom || dateTo
                ? {
                    OR: [
                        {
                            scheduledAt: {
                                ...(dateFrom && { gte: new Date(dateFrom) }),
                                ...(dateTo && { lte: new Date(dateTo) }),
                            },
                        },
                        {
                            startedAt: {
                                ...(dateFrom && { gte: new Date(dateFrom) }),
                                ...(dateTo && { lte: new Date(dateTo) }),
                            },
                        },
                        {
                            createdAt: {
                                ...(dateFrom && { gte: new Date(dateFrom) }),
                                ...(dateTo && { lte: new Date(dateTo) }),
                            },
                        },
                    ],
                }
                : {}),
            ...(search && {
                OR: [
                    { subject: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                    { notes: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [items, total] = await Promise.all([
            this.prisma.call.findMany({
                where,
                include: this.callInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.call.count({ where }),
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
        const call = await this.prisma.call.findFirst({
            where: { id, companyId },
            include: this.callInclude,
        });
        if (!call) {
            throw new common_1.NotFoundException('Call not found');
        }
        return call;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        return this.prisma.call.update({
            where: { id },
            data: {
                ...(dto.subject !== undefined && { subject: dto.subject }),
                ...(dto.direction !== undefined && { direction: dto.direction }),
                ...(dto.outcome !== undefined && { outcome: dto.outcome }),
                ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
                ...(dto.scheduledAt !== undefined && {
                    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                }),
                ...(dto.startedAt !== undefined && {
                    startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
                }),
                ...(dto.endedAt !== undefined && {
                    endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
                }),
                ...(dto.duration !== undefined && { duration: dto.duration }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.followUpDate !== undefined && {
                    followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
                }),
                ...(dto.followUpNotes !== undefined && {
                    followUpNotes: dto.followUpNotes,
                }),
                ...(dto.customerId !== undefined && {
                    customerId: dto.customerId || null,
                }),
                ...(dto.contactId !== undefined && {
                    contactId: dto.contactId || null,
                }),
                ...(dto.leadId !== undefined && { leadId: dto.leadId || null }),
                ...(dto.dealId !== undefined && { dealId: dto.dealId || null }),
                ...(dto.crmCompanyId !== undefined && {
                    crmCompanyId: dto.crmCompanyId || null,
                }),
                ...(dto.assignedToId !== undefined && {
                    assignedToId: dto.assignedToId || null,
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: this.callInclude,
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.call.delete({ where: { id } });
    }
    async logCall(companyId, id, outcome, notes, duration) {
        await this.findOne(companyId, id);
        const now = new Date();
        return this.prisma.call.update({
            where: { id },
            data: {
                outcome,
                notes: notes || undefined,
                duration: duration || undefined,
                startedAt: { set: now },
                endedAt: duration ? new Date(now.getTime() + duration * 1000) : now,
            },
            include: this.callInclude,
        });
    }
    async getDirections() {
        return Object.values(client_1.CallDirection);
    }
    async getOutcomes() {
        return Object.values(client_1.CallOutcome);
    }
    async getStatistics(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [totalCalls, todayCalls, weekCalls, scheduledCalls, completedCalls, byDirection, byOutcome,] = await Promise.all([
            this.prisma.call.count({
                where: { companyId, isActive: true },
            }),
            this.prisma.call.count({
                where: {
                    companyId,
                    isActive: true,
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            this.prisma.call.count({
                where: {
                    companyId,
                    isActive: true,
                    createdAt: { gte: weekAgo },
                },
            }),
            this.prisma.call.count({
                where: {
                    companyId,
                    isActive: true,
                    scheduledAt: { gte: new Date() },
                    outcome: null,
                },
            }),
            this.prisma.call.count({
                where: {
                    companyId,
                    isActive: true,
                    outcome: 'COMPLETED',
                },
            }),
            this.prisma.call.groupBy({
                by: ['direction'],
                where: { companyId, isActive: true },
                _count: { id: true },
            }),
            this.prisma.call.groupBy({
                by: ['outcome'],
                where: { companyId, isActive: true, outcome: { not: null } },
                _count: { id: true },
            }),
        ]);
        return {
            totalCalls,
            todayCalls,
            weekCalls,
            scheduledCalls,
            completedCalls,
            byDirection: byDirection.reduce((acc, item) => ({
                ...acc,
                [item.direction]: item._count.id,
            }), {}),
            byOutcome: byOutcome.reduce((acc, item) => ({
                ...acc,
                [item.outcome || 'NONE']: item._count.id,
            }), {}),
        };
    }
    async getUpcomingCalls(companyId, userId, limit = 10) {
        return this.prisma.call.findMany({
            where: {
                companyId,
                isActive: true,
                scheduledAt: { gte: new Date() },
                outcome: null,
                ...(userId && { assignedToId: userId }),
            },
            include: this.callInclude,
            orderBy: { scheduledAt: 'asc' },
            take: limit,
        });
    }
};
exports.CallsService = CallsService;
exports.CallsService = CallsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CallsService);
//# sourceMappingURL=calls.service.js.map