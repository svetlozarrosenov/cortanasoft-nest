import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import {
  CreateEmployeeAdvanceDto,
  LedgerQueryDto,
  UpdateEmployeeAdvanceDto,
} from './dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

// Разходите, които се броят срещу аванса — анулираните не
const EXPENSE_WHERE = (companyId: string, userId?: string) =>
  ({
    companyId,
    advanceUserId: userId ?? { not: null },
    status: { not: 'CANCELLED' },
  }) satisfies Prisma.ExpenseWhereInput;

export interface LedgerAllocation {
  advanceId: string;
  date: string;
  amount: number;
}

export interface LedgerRow {
  id: string;
  kind: 'ADVANCE' | 'RETURN' | 'EXPENSE';
  date: string;
  amount: number; // със знак: аванс +, връщане/разход −
  balance: number; // салдо след реда
  note: string | null;
  paymentMethod: string | null;
  expense: {
    id: string;
    description: string;
    category: string;
    status: string;
    site: { id: string; name: string } | null;
  } | null;
  allocations: LedgerAllocation[]; // от кой аванс (FIFO)
}

/**
 * Служебни аванси: салдото на служителя никога не се пази — винаги е
 * дадено − върнато − отчетени разходи (Expense.advanceUserId). „От кой аванс"
 * е FIFO по дата, както плащанията по фактурите.
 */
@Injectable()
export class EmployeeAdvancesService {
  constructor(private prisma: PrismaService) {}

  private async assertEmployee(companyId: string, userId: string) {
    const member = await this.prisma.userCompany.findFirst({
      where: { companyId, userId },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException(
        ErrorMessages.employeeAdvances.employeeNotInCompany,
      );
    }
  }

  /** Активните служители — за избора при нов аванс / разход */
  async employees(companyId: string) {
    const rows = await this.prisma.userCompany.findMany({
      where: { companyId, user: { isActive: true } },
      select: {
        user: { select: { id: true, firstName: true, lastName: true } },
        position: { select: { name: true } },
      },
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });
    return rows.map((r) => ({ ...r.user, position: r.position?.name ?? null }));
  }

  /** Списъкът по служители: дадено / върнато / отчетено / салдо */
  async summary(companyId: string) {
    const [advances, expenses] = await Promise.all([
      this.prisma.employeeAdvance.groupBy({
        by: ['userId', 'type'],
        where: { companyId },
        _sum: { amount: true },
        _max: { date: true },
      }),
      this.prisma.expense.findMany({
        where: EXPENSE_WHERE(companyId),
        select: {
          advanceUserId: true,
          totalAmount: true,
          exchangeRate: true,
          expenseDate: true,
        },
      }),
    ]);

    const byUser = new Map<
      string,
      { issued: number; returned: number; spent: number; last: Date | null }
    >();
    const bucket = (userId: string) => {
      let b = byUser.get(userId);
      if (!b) {
        b = { issued: 0, returned: 0, spent: 0, last: null };
        byUser.set(userId, b);
      }
      return b;
    };
    const touch = (b: { last: Date | null }, d: Date | null) => {
      if (d && (!b.last || d > b.last)) b.last = d;
    };
    for (const a of advances) {
      const b = bucket(a.userId);
      const sum = Number(a._sum.amount ?? 0);
      if (a.type === 'ISSUED') b.issued += sum;
      else b.returned += sum;
      touch(b, a._max.date);
    }
    for (const e of expenses) {
      const b = bucket(e.advanceUserId!);
      b.spent += Number(e.totalAmount) * Number(e.exchangeRate);
      touch(b, e.expenseDate);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...byUser.keys()] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isActive: true,
        userCompanies: {
          where: { companyId },
          select: { position: { select: { name: true } } },
        },
      },
    });

    return users
      .map((u) => {
        const b = byUser.get(u.id)!;
        return {
          user: {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            isActive: u.isActive,
            position: u.userCompanies[0]?.position?.name ?? null,
          },
          issued: round2(b.issued),
          returned: round2(b.returned),
          spent: round2(b.spent),
          balance: round2(b.issued - b.returned - b.spent),
          lastMovementAt: b.last,
        };
      })
      .sort(
        (a, b) =>
          b.balance - a.balance ||
          a.user.firstName.localeCompare(b.user.firstName),
      );
  }

  /** Текущото салдо на един служител (за модала на разхода) */
  async balance(companyId: string, userId: string) {
    const rows = await this.ledgerRows(companyId, userId);
    return { balance: rows.length ? rows[rows.length - 1].balance : 0 };
  }

  /** Хронология с текущо салдо и FIFO разпределение по аванси */
  async ledger(companyId: string, userId: string, query: LedgerQueryDto) {
    const [user, rows] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: userId, userCompanies: { some: { companyId } } },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      }),
      this.ledgerRows(companyId, userId),
    ]);
    if (!user) {
      throw new NotFoundException(
        ErrorMessages.employeeAdvances.employeeNotInCompany,
      );
    }

    // Аванси с използвано / остава (по FIFO)
    const advances = rows
      .filter((r) => r.kind === 'ADVANCE')
      .map((r) => ({
        id: r.id,
        date: r.date,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        note: r.note,
        used: 0,
        remaining: r.amount,
      }));
    const byId = new Map(advances.map((a) => [a.id, a]));
    for (const r of rows) {
      for (const al of r.allocations) {
        const a = byId.get(al.advanceId);
        if (a) {
          a.used = round2(a.used + al.amount);
          a.remaining = round2(a.remaining - al.amount);
        }
      }
    }

    // Период: показваме само редовете в него, но салдото тръгва от началото
    const inRange = rows.filter(
      (r) =>
        (!query.from || r.date >= query.from) &&
        (!query.to || r.date <= query.to),
    );
    const before = rows.filter((r) => query.from && r.date < query.from);
    const openingBalance = before.length
      ? before[before.length - 1].balance
      : 0;

    const totals = inRange.reduce(
      (acc, r) => {
        if (r.kind === 'ADVANCE') acc.issued += r.amount;
        else if (r.kind === 'RETURN') acc.returned += -r.amount;
        else acc.spent += -r.amount;
        return acc;
      },
      { issued: 0, returned: 0, spent: 0 },
    );

    return {
      user,
      openingBalance,
      balance: rows.length ? rows[rows.length - 1].balance : 0,
      totals: {
        issued: round2(totals.issued),
        returned: round2(totals.returned),
        spent: round2(totals.spent),
      },
      advances,
      rows: inRange,
    };
  }

  private async ledgerRows(
    companyId: string,
    userId: string,
  ): Promise<LedgerRow[]> {
    const [advances, expenses] = await Promise.all([
      this.prisma.employeeAdvance.findMany({
        where: { companyId, userId },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.expense.findMany({
        where: EXPENSE_WHERE(companyId, userId),
        orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          description: true,
          category: true,
          status: true,
          totalAmount: true,
          exchangeRate: true,
          expenseDate: true,
          createdAt: true,
          site: { select: { id: true, name: true } },
        },
      }),
    ]);

    type Pending = { row: LedgerRow; sortDate: string; createdAt: Date };
    const pending: Pending[] = [
      ...advances.map((a) => ({
        sortDate: dateKey(a.date),
        createdAt: a.createdAt,
        row: {
          id: a.id,
          kind: (a.type === 'ISSUED'
            ? 'ADVANCE'
            : 'RETURN') as LedgerRow['kind'],
          date: dateKey(a.date),
          amount: a.type === 'ISSUED' ? Number(a.amount) : -Number(a.amount),
          balance: 0,
          note: a.note,
          paymentMethod: a.paymentMethod,
          expense: null,
          allocations: [],
        },
      })),
      ...expenses.map((e) => ({
        sortDate: dateKey(e.expenseDate),
        createdAt: e.createdAt,
        row: {
          id: e.id,
          kind: 'EXPENSE' as const,
          date: dateKey(e.expenseDate),
          amount: -round2(Number(e.totalAmount) * Number(e.exchangeRate)),
          balance: 0,
          note: null,
          paymentMethod: null,
          expense: {
            id: e.id,
            description: e.description,
            category: e.category,
            status: e.status,
            site: e.site,
          },
          allocations: [],
        },
      })),
    ];
    // В един ден: първо авансите, после разходите — иначе разход сутринта
    // „изпреварва" аванса от същия ден
    const order = { ADVANCE: 0, RETURN: 1, EXPENSE: 2 };
    pending.sort(
      (a, b) =>
        a.sortDate.localeCompare(b.sortDate) ||
        order[a.row.kind] - order[b.row.kind] ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // FIFO: всяко излизане (разход/връщане) изчерпва най-стария аванс с остатък
    const open: { id: string; date: string; remaining: number }[] = [];
    let balance = 0;
    for (const { row } of pending) {
      if (row.kind === 'ADVANCE') {
        open.push({ id: row.id, date: row.date, remaining: row.amount });
      } else {
        let left = -row.amount;
        while (left > 0.004 && open.length) {
          const head = open[0];
          const take = Math.min(head.remaining, left);
          if (take > 0) {
            row.allocations.push({
              advanceId: head.id,
              date: head.date,
              amount: round2(take),
            });
            head.remaining = round2(head.remaining - take);
            left = round2(left - take);
          }
          if (head.remaining <= 0.004) open.shift();
        }
        // left > 0 → непокрит от аванс (салдото става отрицателно)
      }
      balance = round2(balance + row.amount);
      row.balance = balance;
    }
    return pending.map((p) => p.row);
  }

  async create(
    companyId: string,
    createdById: string,
    dto: CreateEmployeeAdvanceDto,
  ) {
    await this.assertEmployee(companyId, dto.userId);
    return this.prisma.employeeAdvance.create({
      data: {
        companyId,
        userId: dto.userId,
        type: dto.type ?? 'ISSUED',
        date: new Date(dto.date),
        amount: new Prisma.Decimal(dto.amount),
        paymentMethod: dto.paymentMethod ?? 'CASH',
        note: dto.note?.trim() || null,
        createdById,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeAdvanceDto) {
    const existing = await this.prisma.employeeAdvance.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.employeeAdvances.notFound);
    }
    return this.prisma.employeeAdvance.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.amount !== undefined && {
          amount: new Prisma.Decimal(dto.amount),
        }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.employeeAdvance.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(ErrorMessages.employeeAdvances.notFound);
    }
    await this.prisma.employeeAdvance.delete({ where: { id } });
    return { success: true };
  }
}
