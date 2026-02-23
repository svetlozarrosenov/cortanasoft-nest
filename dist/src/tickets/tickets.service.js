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
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let TicketsService = class TicketsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateTicketNumber(companyId) {
        const year = new Date().getFullYear();
        const prefix = `TKT-${year}-`;
        const lastTicket = await this.prisma.ticket.findFirst({
            where: {
                companyId,
                ticketNumber: { startsWith: prefix },
            },
            orderBy: { ticketNumber: 'desc' },
        });
        let nextNumber = 1;
        if (lastTicket) {
            const lastNumber = parseInt(lastTicket.ticketNumber.split('-')[2]);
            nextNumber = lastNumber + 1;
        }
        return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
    }
    async create(companyId, userId, dto) {
        const ticketNumber = await this.generateTicketNumber(companyId);
        return this.prisma.ticket.create({
            data: {
                ticketNumber,
                title: dto.title,
                description: dto.description,
                type: dto.type || 'TASK',
                priority: dto.priority || 'MEDIUM',
                status: 'TODO',
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                estimatedHours: dto.estimatedHours,
                assigneeId: dto.assigneeId,
                parentId: dto.parentId,
                tags: dto.tags,
                companyId,
                createdById: userId,
            },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                _count: {
                    select: { subtasks: true, comments: true },
                },
            },
        });
    }
    async findAll(companyId, userId, query) {
        const { search, status, priority, type, assigneeId, createdById, myTickets, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = { companyId };
        if (myTickets === 'assigned') {
            where.assigneeId = userId;
        }
        else if (myTickets === 'created') {
            where.createdById = userId;
        }
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        if (type)
            where.type = type;
        if (assigneeId)
            where.assigneeId = assigneeId;
        if (createdById)
            where.createdById = createdById;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { ticketNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [tickets, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    assignee: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                    createdBy: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                    _count: {
                        select: { subtasks: true, comments: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.ticket.count({ where }),
        ]);
        return {
            data: tickets,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                parent: {
                    select: { id: true, ticketNumber: true, title: true },
                },
                subtasks: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        title: true,
                        status: true,
                        priority: true,
                        assignee: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                reminders: {
                    where: { isSent: false },
                    orderBy: { remindAt: 'asc' },
                },
            },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return ticket;
    }
    async update(companyId, id, dto) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        const updateData = { ...dto };
        if (dto.dueDate) {
            updateData.dueDate = new Date(dto.dueDate);
        }
        if (dto.status) {
            if (dto.status === 'IN_PROGRESS' && !ticket.startedAt) {
                updateData.startedAt = new Date();
            }
            if (dto.status === 'DONE' && !ticket.completedAt) {
                updateData.completedAt = new Date();
            }
            if (dto.status !== 'DONE') {
                updateData.completedAt = null;
            }
        }
        return this.prisma.ticket.update({
            where: { id },
            data: updateData,
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                _count: {
                    select: { subtasks: true, comments: true },
                },
            },
        });
    }
    async remove(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        await this.prisma.ticket.delete({ where: { id } });
        return { success: true };
    }
    async startProgress(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (ticket.status !== 'TODO') {
            throw new common_1.BadRequestException('Can only start tickets with TODO status');
        }
        return this.prisma.ticket.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
            },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async submitForReview(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (ticket.status !== 'IN_PROGRESS') {
            throw new common_1.BadRequestException('Can only submit tickets that are in progress');
        }
        return this.prisma.ticket.update({
            where: { id },
            data: { status: 'IN_REVIEW' },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async complete(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (!['IN_PROGRESS', 'IN_REVIEW'].includes(ticket.status)) {
            throw new common_1.BadRequestException('Can only complete tickets that are in progress or review');
        }
        return this.prisma.ticket.update({
            where: { id },
            data: {
                status: 'DONE',
                completedAt: new Date(),
            },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async cancel(companyId, id) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (ticket.status === 'DONE') {
            throw new common_1.BadRequestException('Cannot cancel completed tickets');
        }
        return this.prisma.ticket.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async assignToMe(companyId, id, userId) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return this.prisma.ticket.update({
            where: { id },
            data: { assigneeId: userId },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                createdBy: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async addComment(companyId, ticketId, userId, dto) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id: ticketId, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return this.prisma.ticketComment.create({
            data: {
                content: dto.content,
                ticketId,
                authorId: userId,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async getComments(companyId, ticketId) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id: ticketId, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return this.prisma.ticketComment.findMany({
            where: { ticketId },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteComment(companyId, ticketId, commentId) {
        const comment = await this.prisma.ticketComment.findFirst({
            where: { id: commentId, ticketId },
            include: { ticket: true },
        });
        if (!comment || comment.ticket.companyId !== companyId) {
            throw new common_1.NotFoundException('Comment not found');
        }
        await this.prisma.ticketComment.delete({ where: { id: commentId } });
        return { success: true };
    }
    async addReminder(companyId, ticketId, userId, dto) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id: ticketId, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return this.prisma.ticketReminder.create({
            data: {
                remindAt: new Date(dto.remindAt),
                message: dto.message,
                ticketId,
                userId: dto.userId || userId,
                recurrence: dto.recurrence || 'NONE',
                intervalDays: dto.intervalDays,
                recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : null,
                recurrenceCount: dto.recurrenceCount,
            },
        });
    }
    async getReminders(companyId, ticketId) {
        const ticket = await this.prisma.ticket.findFirst({
            where: { id: ticketId, companyId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return this.prisma.ticketReminder.findMany({
            where: { ticketId },
            orderBy: { remindAt: 'asc' },
        });
    }
    async deleteReminder(companyId, ticketId, reminderId) {
        const reminder = await this.prisma.ticketReminder.findFirst({
            where: { id: reminderId, ticketId },
            include: { ticket: true },
        });
        if (!reminder || reminder.ticket.companyId !== companyId) {
            throw new common_1.NotFoundException('Reminder not found');
        }
        await this.prisma.ticketReminder.delete({ where: { id: reminderId } });
        return { success: true };
    }
    async getMyReminders(userId) {
        return this.prisma.ticketReminder.findMany({
            where: {
                userId,
                isSent: false,
                remindAt: { lte: new Date() },
            },
            include: {
                ticket: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        title: true,
                        companyId: true,
                    },
                },
            },
            orderBy: { remindAt: 'asc' },
        });
    }
    async markReminderSent(reminderId) {
        const reminder = await this.prisma.ticketReminder.findUnique({
            where: { id: reminderId },
        });
        if (!reminder) {
            throw new common_1.NotFoundException('Reminder not found');
        }
        const now = new Date();
        const newSentCount = reminder.sentCount + 1;
        if (reminder.recurrence !== 'NONE') {
            if (reminder.recurrenceCount &&
                newSentCount >= reminder.recurrenceCount) {
                return this.prisma.ticketReminder.update({
                    where: { id: reminderId },
                    data: {
                        isSent: true,
                        sentAt: now,
                        sentCount: newSentCount,
                    },
                });
            }
            const nextRemindAt = this.calculateNextReminderTime(reminder.remindAt, reminder.recurrence, reminder.intervalDays);
            if (reminder.recurrenceEnd && nextRemindAt > reminder.recurrenceEnd) {
                return this.prisma.ticketReminder.update({
                    where: { id: reminderId },
                    data: {
                        isSent: true,
                        sentAt: now,
                        sentCount: newSentCount,
                    },
                });
            }
            return this.prisma.ticketReminder.update({
                where: { id: reminderId },
                data: {
                    remindAt: nextRemindAt,
                    isSent: false,
                    sentAt: now,
                    sentCount: newSentCount,
                },
            });
        }
        return this.prisma.ticketReminder.update({
            where: { id: reminderId },
            data: {
                isSent: true,
                sentAt: now,
                sentCount: newSentCount,
            },
        });
    }
    calculateNextReminderTime(currentTime, recurrence, intervalDays) {
        const next = new Date(currentTime);
        switch (recurrence) {
            case 'DAILY':
                next.setDate(next.getDate() + 1);
                break;
            case 'WEEKLY':
                next.setDate(next.getDate() + 7);
                break;
            case 'BIWEEKLY':
                next.setDate(next.getDate() + 14);
                break;
            case 'MONTHLY':
                next.setMonth(next.getMonth() + 1);
                break;
            case 'CUSTOM':
                if (intervalDays) {
                    next.setDate(next.getDate() + intervalDays);
                }
                break;
        }
        return next;
    }
    async getSummary(companyId, userId) {
        const [total, myAssigned, myCreated, todo, inProgress, inReview, done, overdue, urgent,] = await Promise.all([
            this.prisma.ticket.count({ where: { companyId } }),
            this.prisma.ticket.count({ where: { companyId, assigneeId: userId } }),
            this.prisma.ticket.count({ where: { companyId, createdById: userId } }),
            this.prisma.ticket.count({ where: { companyId, status: 'TODO' } }),
            this.prisma.ticket.count({ where: { companyId, status: 'IN_PROGRESS' } }),
            this.prisma.ticket.count({ where: { companyId, status: 'IN_REVIEW' } }),
            this.prisma.ticket.count({ where: { companyId, status: 'DONE' } }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    status: { notIn: ['DONE', 'CANCELLED'] },
                    dueDate: { lt: new Date() },
                },
            }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    priority: 'URGENT',
                    status: { notIn: ['DONE', 'CANCELLED'] },
                },
            }),
        ]);
        return {
            total,
            myAssigned,
            myCreated,
            byStatus: { todo, inProgress, inReview, done },
            overdue,
            urgent,
        };
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map