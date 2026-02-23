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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, userId, dto) {
        const amount = dto.amount;
        const vatAmount = dto.vatAmount || 0;
        const totalAmount = amount + vatAmount;
        return this.prisma.expense.create({
            data: {
                description: dto.description,
                category: dto.category,
                amount,
                vatAmount,
                totalAmount,
                expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                invoiceNumber: dto.invoiceNumber,
                receiptNumber: dto.receiptNumber,
                attachmentUrl: dto.attachmentUrl,
                status: dto.status || 'PENDING',
                notes: dto.notes,
                isRecurring: dto.isRecurring || false,
                recurringInterval: dto.recurringInterval,
                companyId,
                supplierId: dto.supplierId,
                createdById: userId,
            },
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            companyId,
        };
        if (query.search) {
            where.OR = [
                { description: { contains: query.search, mode: 'insensitive' } },
                { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
                { receiptNumber: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.category) {
            where.category = query.category;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.supplierId) {
            where.supplierId = query.supplierId;
        }
        if (query.dateFrom || query.dateTo) {
            where.expenseDate = {};
            if (query.dateFrom) {
                where.expenseDate.gte = new Date(query.dateFrom);
            }
            if (query.dateTo) {
                where.expenseDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
            }
        }
        const orderBy = {};
        if (query.sortBy) {
            orderBy[query.sortBy] = query.sortOrder || 'desc';
        }
        else {
            orderBy.expenseDate = 'desc';
        }
        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    supplier: true,
                    createdBy: {
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
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.expense.count({ where }),
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
        const expense = await this.prisma.expense.findFirst({
            where: {
                id,
                companyId,
            },
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Разходът не е намерен');
        }
        return expense;
    }
    async update(companyId, id, dto) {
        await this.findOne(companyId, id);
        const updateData = {};
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.category !== undefined)
            updateData.category = dto.category;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.notes !== undefined)
            updateData.notes = dto.notes;
        if (dto.invoiceNumber !== undefined)
            updateData.invoiceNumber = dto.invoiceNumber;
        if (dto.receiptNumber !== undefined)
            updateData.receiptNumber = dto.receiptNumber;
        if (dto.attachmentUrl !== undefined)
            updateData.attachmentUrl = dto.attachmentUrl;
        if (dto.isRecurring !== undefined)
            updateData.isRecurring = dto.isRecurring;
        if (dto.recurringInterval !== undefined)
            updateData.recurringInterval = dto.recurringInterval;
        if (dto.expenseDate !== undefined) {
            updateData.expenseDate = new Date(dto.expenseDate);
        }
        if (dto.dueDate !== undefined) {
            updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
        }
        if (dto.paidAt !== undefined) {
            updateData.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
        }
        if (dto.amount !== undefined || dto.vatAmount !== undefined) {
            const currentExpense = await this.findOne(companyId, id);
            const amount = dto.amount ?? Number(currentExpense.amount);
            const vatAmount = dto.vatAmount ?? Number(currentExpense.vatAmount);
            updateData.amount = amount;
            updateData.vatAmount = vatAmount;
            updateData.totalAmount = amount + vatAmount;
        }
        if (dto.supplierId !== undefined) {
            if (dto.supplierId) {
                updateData.supplier = { connect: { id: dto.supplierId } };
            }
            else {
                updateData.supplier = { disconnect: true };
            }
        }
        if (dto.approvedById !== undefined) {
            if (dto.approvedById) {
                updateData.approvedBy = { connect: { id: dto.approvedById } };
                updateData.approvedAt = new Date();
            }
        }
        return this.prisma.expense.update({
            where: { id },
            data: updateData,
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
    }
    async approve(companyId, id, userId) {
        await this.findOne(companyId, id);
        return this.prisma.expense.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: userId,
                approvedAt: new Date(),
            },
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
    }
    async markAsPaid(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.expense.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date(),
            },
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
    }
    async cancel(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.expense.update({
            where: { id },
            data: {
                status: 'CANCELLED',
            },
            include: {
                supplier: true,
                createdBy: {
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
                        email: true,
                    },
                },
            },
        });
    }
    async remove(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.expense.delete({
            where: { id },
        });
    }
    async getExpensesSummary(companyId, dateFrom, dateTo) {
        const expenses = await this.prisma.expense.findMany({
            where: {
                companyId,
                expenseDate: {
                    gte: dateFrom,
                    lte: dateTo,
                },
                status: {
                    in: ['APPROVED', 'PAID'],
                },
            },
        });
        const byCategory = new Map();
        let totalExpenses = 0;
        for (const expense of expenses) {
            const amount = Number(expense.totalAmount);
            totalExpenses += amount;
            const existing = byCategory.get(expense.category) || 0;
            byCategory.set(expense.category, existing + amount);
        }
        return {
            totalExpenses,
            expenseCount: expenses.length,
            byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({
                category,
                amount,
            })).sort((a, b) => b.amount - a.amount),
        };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map