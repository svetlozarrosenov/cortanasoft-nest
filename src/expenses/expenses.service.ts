import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  QueryExpensesDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateExpenseDto) {
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

  async findAll(companyId: string, query: QueryExpensesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
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

    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
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

  async findOne(companyId: string, id: string) {
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
      throw new NotFoundException('Разходът не е намерен');
    }

    return expense;
  }

  async update(companyId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(companyId, id);

    const updateData: Prisma.ExpenseUpdateInput = {};

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.invoiceNumber !== undefined)
      updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.receiptNumber !== undefined)
      updateData.receiptNumber = dto.receiptNumber;
    if (dto.attachmentUrl !== undefined)
      updateData.attachmentUrl = dto.attachmentUrl;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
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
      } else {
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

  async approve(companyId: string, id: string, userId: string) {
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

  async markAsPaid(companyId: string, id: string) {
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

  async cancel(companyId: string, id: string) {
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

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // Get expenses summary for analytics
  async getExpensesSummary(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
  ) {
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

    // Group by category
    const byCategory = new Map<string, number>();
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
}
