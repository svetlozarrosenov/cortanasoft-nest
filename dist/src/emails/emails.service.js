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
exports.EmailsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let EmailsService = class EmailsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    emailInclude = {
        customer: {
            select: {
                id: true,
                type: true,
                companyName: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        },
        contact: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
            },
        },
        lead: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
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
                email: true,
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
        return this.prisma.email.create({
            data: {
                subject: dto.subject,
                body: dto.body,
                bodyText: dto.bodyText,
                direction: dto.direction || 'OUTBOUND',
                priority: dto.priority || 'NORMAL',
                fromEmail: dto.fromEmail,
                fromName: dto.fromName,
                toEmail: dto.toEmail,
                toName: dto.toName,
                cc: dto.cc,
                bcc: dto.bcc,
                replyTo: dto.replyTo,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
                attachments: dto.attachments || undefined,
                threadId: dto.threadId,
                inReplyTo: dto.inReplyTo,
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
            include: this.emailInclude,
        });
    }
    async findAll(companyId, query) {
        const { search, direction, status, priority, customerId, contactId, leadId, dealId, crmCompanyId, assignedToId, threadId, dateFrom, dateTo, scheduled, isActive, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(isActive !== undefined && { isActive }),
            ...(direction && { direction }),
            ...(status && { status }),
            ...(priority && { priority }),
            ...(customerId && { customerId }),
            ...(contactId && { contactId }),
            ...(leadId && { leadId }),
            ...(dealId && { dealId }),
            ...(crmCompanyId && { crmCompanyId }),
            ...(assignedToId && { assignedToId }),
            ...(threadId && { threadId }),
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
                            sentAt: {
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
                    { fromEmail: { contains: search, mode: 'insensitive' } },
                    { toEmail: { contains: search, mode: 'insensitive' } },
                    { body: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [items, total] = await Promise.all([
            this.prisma.email.findMany({
                where,
                include: this.emailInclude,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.email.count({ where }),
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
        const email = await this.prisma.email.findFirst({
            where: { id, companyId },
            include: this.emailInclude,
        });
        if (!email) {
            throw new common_1.NotFoundException('Email not found');
        }
        return email;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        return this.prisma.email.update({
            where: { id },
            data: {
                ...(dto.subject !== undefined && { subject: dto.subject }),
                ...(dto.body !== undefined && { body: dto.body }),
                ...(dto.bodyText !== undefined && { bodyText: dto.bodyText }),
                ...(dto.direction !== undefined && { direction: dto.direction }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.priority !== undefined && { priority: dto.priority }),
                ...(dto.fromEmail !== undefined && { fromEmail: dto.fromEmail }),
                ...(dto.fromName !== undefined && { fromName: dto.fromName }),
                ...(dto.toEmail !== undefined && { toEmail: dto.toEmail }),
                ...(dto.toName !== undefined && { toName: dto.toName }),
                ...(dto.cc !== undefined && { cc: dto.cc }),
                ...(dto.bcc !== undefined && { bcc: dto.bcc }),
                ...(dto.replyTo !== undefined && { replyTo: dto.replyTo }),
                ...(dto.scheduledAt !== undefined && {
                    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                }),
                ...(dto.attachments !== undefined && { attachments: dto.attachments }),
                ...(dto.threadId !== undefined && { threadId: dto.threadId }),
                ...(dto.inReplyTo !== undefined && { inReplyTo: dto.inReplyTo }),
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
            include: this.emailInclude,
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.email.delete({ where: { id } });
    }
    async send(companyId, id) {
        const email = await this.findOne(companyId, id);
        if (email.status !== 'DRAFT') {
            throw new Error('Only draft emails can be sent');
        }
        const now = new Date();
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: now,
            },
            include: this.emailInclude,
        });
    }
    async markAsRead(companyId, id) {
        await this.findOne(companyId, id);
        const now = new Date();
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'READ',
                readAt: now,
            },
            include: this.emailInclude,
        });
    }
    async archive(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.email.update({
            where: { id },
            data: {
                status: 'ARCHIVED',
            },
            include: this.emailInclude,
        });
    }
    async getDirections() {
        return Object.values(client_1.EmailDirection);
    }
    async getStatuses() {
        return Object.values(client_1.EmailStatus);
    }
    async getPriorities() {
        return Object.values(client_1.EmailPriority);
    }
    async getStatistics(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const [totalEmails, todayEmails, weekEmails, draftEmails, sentEmails, scheduledEmails, byDirection, byStatus, byPriority,] = await Promise.all([
            this.prisma.email.count({
                where: { companyId, isActive: true },
            }),
            this.prisma.email.count({
                where: {
                    companyId,
                    isActive: true,
                    createdAt: { gte: today, lt: tomorrow },
                },
            }),
            this.prisma.email.count({
                where: {
                    companyId,
                    isActive: true,
                    createdAt: { gte: weekAgo },
                },
            }),
            this.prisma.email.count({
                where: {
                    companyId,
                    isActive: true,
                    status: 'DRAFT',
                },
            }),
            this.prisma.email.count({
                where: {
                    companyId,
                    isActive: true,
                    status: 'SENT',
                },
            }),
            this.prisma.email.count({
                where: {
                    companyId,
                    isActive: true,
                    scheduledAt: { gte: new Date() },
                    status: 'DRAFT',
                },
            }),
            this.prisma.email.groupBy({
                by: ['direction'],
                where: { companyId, isActive: true },
                _count: { id: true },
            }),
            this.prisma.email.groupBy({
                by: ['status'],
                where: { companyId, isActive: true },
                _count: { id: true },
            }),
            this.prisma.email.groupBy({
                by: ['priority'],
                where: { companyId, isActive: true },
                _count: { id: true },
            }),
        ]);
        return {
            totalEmails,
            todayEmails,
            weekEmails,
            draftEmails,
            sentEmails,
            scheduledEmails,
            byDirection: byDirection.reduce((acc, item) => ({
                ...acc,
                [item.direction]: item._count.id,
            }), {}),
            byStatus: byStatus.reduce((acc, item) => ({
                ...acc,
                [item.status]: item._count.id,
            }), {}),
            byPriority: byPriority.reduce((acc, item) => ({
                ...acc,
                [item.priority]: item._count.id,
            }), {}),
        };
    }
    async getScheduledEmails(companyId, userId, limit = 10) {
        return this.prisma.email.findMany({
            where: {
                companyId,
                isActive: true,
                scheduledAt: { gte: new Date() },
                status: 'DRAFT',
                ...(userId && { assignedToId: userId }),
            },
            include: this.emailInclude,
            orderBy: { scheduledAt: 'asc' },
            take: limit,
        });
    }
    async getThread(companyId, threadId) {
        return this.prisma.email.findMany({
            where: {
                companyId,
                threadId,
                isActive: true,
            },
            include: this.emailInclude,
            orderBy: { createdAt: 'asc' },
        });
    }
};
exports.EmailsService = EmailsService;
exports.EmailsService = EmailsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmailsService);
//# sourceMappingURL=emails.service.js.map