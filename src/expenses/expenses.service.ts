import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  QueryExpensesDto,
  MarkExpensePaidDto,
  ExpenseItemDto,
} from './dto';
import { Prisma, ExpenseCategory } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  // Обектът (siteId) трябва да е на същата компания
  private async assertSiteInCompany(companyId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, companyId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Обектът не е намерен');
    }
  }

  /**
   * Редовете на разхода от DTO-то: `items` или (стари клиенти) един ред от
   * category/amount/vatAmount. Връща и сборовете за хедъра във валутата на
   * компанията (amount × курс на реда).
   */
  static linesFromDto(dto: {
    items?: ExpenseItemDto[];
    description?: string;
    category?: ExpenseCategory;
    amount?: number;
    vatAmount?: number;
  }) {
    const rows: ExpenseItemDto[] =
      dto.items && dto.items.length > 0
        ? dto.items
        : [
            {
              description: dto.description || '',
              category: dto.category || 'OTHER',
              amount: dto.amount || 0,
              vatAmount: dto.vatAmount || 0,
              vatRate:
                dto.amount && dto.amount > 0
                  ? Math.round(((dto.vatAmount || 0) / dto.amount) * 10000) /
                    100
                  : 0,
            },
          ];
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const items = rows.map((r, i) => {
      const vatRate = r.vatRate ?? 0;
      const quantity = r.quantity ?? 1;
      const unitPrice = r.unitPrice ?? r.amount;
      // Сумата на реда е количество × ед. цена; amount от клиента е резерва
      const amount = round2(r.unitPrice != null ? quantity * r.unitPrice : r.amount);
      const vatAmount = r.vatAmount ?? round2((amount * vatRate) / 100);
      return {
        description: r.description,
        category: r.category,
        quantity,
        unitPrice: round2(unitPrice),
        amount,
        vatRate,
        vatAmount: round2(vatAmount),
        currencyId: r.currencyId ?? null,
        exchangeRate: r.exchangeRate ?? 1,
        includeInStockCost: !!r.includeInStockCost,
        stockCostAllocation: r.stockCostAllocation ?? 'VALUE',
        sortOrder: i,
      };
    });
    const amount = round2(
      items.reduce((s, it) => s + it.amount * it.exchangeRate, 0),
    );
    const vatAmount = round2(
      items.reduce((s, it) => s + it.vatAmount * it.exchangeRate, 0),
    );
    return {
      items,
      amount,
      vatAmount,
      totalAmount: round2(amount + vatAmount),
      category: items[0]?.category ?? 'OTHER',
    };
  }

  async create(companyId: string, userId: string, dto: CreateExpenseDto) {
    const lines = ExpensesService.linesFromDto(dto);
    if (
      lines.items.length === 0 ||
      lines.items.some((it) => !it.description.trim())
    ) {
      throw new BadRequestException(
        'Разходът трябва да има поне един ред с описание',
      );
    }

    if (dto.siteId) {
      await this.assertSiteInCompany(companyId, dto.siteId);
    }

    return this.prisma.expense.create({
      data: {
        description: dto.description?.trim() || lines.items[0].description,
        category: lines.category,
        amount: lines.amount,
        vatAmount: lines.vatAmount,
        totalAmount: lines.totalAmount,
        items: { create: lines.items },
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        invoiceNumber: dto.invoiceNumber,
        receiptNumber: dto.receiptNumber,
        attachmentUrl: dto.attachmentUrl,
        status: dto.status || 'PENDING',
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        isRecurring: dto.isRecurring || false,
        recurringInterval: dto.recurringInterval,
        companyId,
        supplierId: dto.supplierId,
        siteId: dto.siteId || undefined,
        createdById: userId,
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' as const } },
        supplier: true,
        site: { select: { id: true, name: true } },
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

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.siteId) {
      where.siteId = query.siteId;
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
          items: { orderBy: { sortOrder: 'asc' as const } },
          supplier: true,
          site: { select: { id: true, name: true } },
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
          goodsReceipt: {
            select: {
              id: true,
              receiptNumber: true,
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
        items: { orderBy: { sortOrder: 'asc' as const } },
        supplier: true,
        site: { select: { id: true, name: true } },
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
    const current = await this.findOne(companyId, id);

    // Разходът към доставка се редактира в доставката — иначе сумите му и
    // доставната стойност на вече заприходената стока се разминават.
    // Статус/плащане минават през approve/markAsPaid/cancel, не оттук.
    if (current.goodsReceiptId) {
      throw new BadRequestException(
        'Разходът е част от доставка и се редактира от нея',
      );
    }

    const updateData: Prisma.ExpenseUpdateInput = {};

    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.paymentMethod !== undefined)
      updateData.paymentMethod = dto.paymentMethod;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.invoiceNumber !== undefined)
      updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.receiptNumber !== undefined)
      updateData.receiptNumber = dto.receiptNumber;
    if (dto.attachmentUrl !== undefined)
      updateData.attachmentUrl = dto.attachmentUrl || null;
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

    if (dto.items !== undefined) {
      // Замяна на всички редове + сборове на хедъра
      const lines = ExpensesService.linesFromDto({
        items: dto.items,
        description: dto.description ?? current.description,
      });
      if (
        lines.items.length === 0 ||
        lines.items.some((it) => !it.description.trim())
      ) {
        throw new BadRequestException(
          'Разходът трябва да има поне един ред с описание',
        );
      }
      updateData.items = { deleteMany: {}, create: lines.items };
      updateData.amount = lines.amount;
      updateData.vatAmount = lines.vatAmount;
      updateData.totalAmount = lines.totalAmount;
      updateData.category = lines.category;
      if (dto.description === undefined) {
        updateData.description = lines.items[0].description;
      }
    } else if (dto.amount !== undefined || dto.vatAmount !== undefined) {
      // Стар клиент без редове: сумите на хедъра + единственият ред
      const amount = dto.amount ?? Number(current.amount);
      const vatAmount = dto.vatAmount ?? Number(current.vatAmount);
      updateData.amount = amount;
      updateData.vatAmount = vatAmount;
      updateData.totalAmount = amount + vatAmount;
      if (current.items.length === 1) {
        updateData.items = {
          update: {
            where: { id: current.items[0].id },
            data: {
              amount,
              vatAmount,
              vatRate:
                amount > 0 ? Math.round((vatAmount / amount) * 10000) / 100 : 0,
              ...(dto.category !== undefined && { category: dto.category }),
              ...(dto.description !== undefined && {
                description: dto.description,
              }),
            },
          },
        };
      }
    }

    if (dto.supplierId !== undefined) {
      if (dto.supplierId) {
        updateData.supplier = { connect: { id: dto.supplierId } };
      } else {
        updateData.supplier = { disconnect: true };
      }
    }

    if (dto.siteId !== undefined) {
      if (dto.siteId) {
        await this.assertSiteInCompany(companyId, dto.siteId);
        updateData.site = { connect: { id: dto.siteId } };
      } else {
        updateData.site = { disconnect: true };
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
        items: { orderBy: { sortOrder: 'asc' as const } },
        supplier: true,
        site: { select: { id: true, name: true } },
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
        items: { orderBy: { sortOrder: 'asc' as const } },
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

  async markAsPaid(companyId: string, id: string, dto?: MarkExpensePaidDto) {
    await this.findOne(companyId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        // Ако при плащането е уточнен начин — записва се; иначе остава въведеният
        ...(dto?.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' as const } },
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
        items: { orderBy: { sortOrder: 'asc' as const } },
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
  async getExpensesSummary(companyId: string, dateFrom: Date, dateTo: Date) {
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
      byCategory: Array.from(byCategory.entries())
        .map(([category, amount]) => ({
          category,
          amount,
        }))
        .sort((a, b) => b.amount - a.amount),
    };
  }
}
