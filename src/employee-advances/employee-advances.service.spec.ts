import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmployeeAdvancesService } from './employee-advances.service';
import { PrismaService } from '../prisma/prisma.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const mockPrisma = {
  userCompany: { findFirst: jest.fn(), findMany: jest.fn() },
  user: { findFirst: jest.fn(), findMany: jest.fn() },
  employeeAdvance: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expense: { findMany: jest.fn() },
};

describe('EmployeeAdvancesService', () => {
  let service: EmployeeAdvancesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        EmployeeAdvancesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(EmployeeAdvancesService);
  });

  describe('ledger (FIFO)', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        firstName: 'Георги',
        lastName: 'Г.',
        isActive: true,
      });
      // 500 на 1-ви, 300 на 6-ти
      mockPrisma.employeeAdvance.findMany.mockResolvedValue([
        {
          id: 'a1',
          type: 'ISSUED',
          date: d('2026-10-01'),
          amount: 500,
          paymentMethod: 'CASH',
          note: null,
          createdAt: d('2026-10-01'),
        },
        {
          id: 'a2',
          type: 'ISSUED',
          date: d('2026-10-06'),
          amount: 300,
          paymentMethod: 'BANK_TRANSFER',
          note: null,
          createdAt: d('2026-10-06'),
        },
      ]);
      // 100, 100, 350 (последният се покрива от два аванса)
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          id: 'e1',
          description: 'Хотел',
          category: 'ACCOMMODATION',
          status: 'PAID',
          totalAmount: 100,
          exchangeRate: 1,
          expenseDate: d('2026-10-03'),
          createdAt: d('2026-10-03'),
          site: { id: 's1', name: 'Пловдив' },
        },
        {
          id: 'e2',
          description: 'Гориво',
          category: 'FUEL',
          status: 'PAID',
          totalAmount: 100,
          exchangeRate: 1,
          expenseDate: d('2026-10-04'),
          createdAt: d('2026-10-04'),
          site: null,
        },
        {
          id: 'e3',
          description: 'Материали',
          category: 'MATERIALS',
          status: 'PAID',
          totalAmount: 350,
          exchangeRate: 1,
          expenseDate: d('2026-10-09'),
          createdAt: d('2026-10-09'),
          site: null,
        },
      ]);
    });

    it('computes running balance in chronological order', async () => {
      const res = await service.ledger('c1', 'u1', {});
      expect(res.rows.map((r) => [r.kind, r.amount, r.balance])).toEqual([
        ['ADVANCE', 500, 500],
        ['EXPENSE', -100, 400],
        ['EXPENSE', -100, 300],
        ['ADVANCE', 300, 600],
        ['EXPENSE', -350, 250],
      ]);
      expect(res.balance).toBe(250);
    });

    it('allocates expenses to advances FIFO and splits across two', async () => {
      const res = await service.ledger('c1', 'u1', {});
      expect(res.rows[1].allocations).toEqual([
        { advanceId: 'a1', date: '2026-10-01', amount: 100 },
      ]);
      expect(res.rows[4].allocations).toEqual([
        { advanceId: 'a1', date: '2026-10-01', amount: 300 },
        { advanceId: 'a2', date: '2026-10-06', amount: 50 },
      ]);
      expect(res.advances).toEqual([
        expect.objectContaining({ id: 'a1', used: 500, remaining: 0 }),
        expect.objectContaining({ id: 'a2', used: 50, remaining: 250 }),
      ]);
    });

    it('filters by period but keeps the opening balance', async () => {
      const res = await service.ledger('c1', 'u1', { from: '2026-10-05' });
      expect(res.openingBalance).toBe(300);
      expect(res.rows.map((r) => r.id)).toEqual(['a2', 'e3']);
      expect(res.totals).toEqual({ issued: 300, returned: 0, spent: 350 });
    });

    it('goes negative when expenses exceed advances', async () => {
      mockPrisma.employeeAdvance.findMany.mockResolvedValue([]);
      const res = await service.ledger('c1', 'u1', {});
      expect(res.balance).toBe(-550);
      expect(res.rows[0].allocations).toEqual([]);
    });

    it('puts a same-day advance before a same-day expense', async () => {
      mockPrisma.employeeAdvance.findMany.mockResolvedValue([
        {
          id: 'a1',
          type: 'ISSUED',
          date: d('2026-10-03'),
          amount: 500,
          paymentMethod: 'CASH',
          note: null,
          createdAt: d('2026-10-03T12:00:00'),
        },
      ]);
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          id: 'e1',
          description: 'x',
          category: 'OTHER',
          status: 'PAID',
          totalAmount: 100,
          exchangeRate: 1,
          expenseDate: d('2026-10-03'),
          createdAt: d('2026-10-03T08:00:00'),
          site: null,
        },
      ]);
      const res = await service.ledger('c1', 'u1', {});
      expect(res.rows.map((r) => r.kind)).toEqual(['ADVANCE', 'EXPENSE']);
      expect(res.rows[1].allocations[0].advanceId).toBe('a1');
    });

    it('converts expenses in foreign currency via exchangeRate', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          id: 'e1',
          description: 'x',
          category: 'OTHER',
          status: 'PAID',
          totalAmount: 100,
          exchangeRate: 1.95583,
          expenseDate: d('2026-10-03'),
          createdAt: d('2026-10-03'),
          site: null,
        },
      ]);
      const res = await service.ledger('c1', 'u1', {});
      expect(res.rows[1].amount).toBe(-195.58);
    });
  });

  describe('summary', () => {
    it('aggregates issued / returned / spent per employee', async () => {
      mockPrisma.employeeAdvance.groupBy.mockResolvedValue([
        {
          userId: 'u1',
          type: 'ISSUED',
          _sum: { amount: 800 },
          _max: { date: d('2026-10-06') },
        },
        {
          userId: 'u1',
          type: 'RETURNED',
          _sum: { amount: 50 },
          _max: { date: d('2026-10-10') },
        },
      ]);
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          advanceUserId: 'u1',
          totalAmount: 200,
          exchangeRate: 1,
          expenseDate: d('2026-10-03'),
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          firstName: 'Георги',
          lastName: 'Г.',
          isActive: true,
          userCompanies: [{ position: { name: 'Монтажник' } }],
        },
      ]);
      const res = await service.summary('c1');
      expect(res).toEqual([
        {
          user: {
            id: 'u1',
            firstName: 'Георги',
            lastName: 'Г.',
            isActive: true,
            position: 'Монтажник',
          },
          issued: 800,
          returned: 50,
          spent: 200,
          balance: 550,
          lastMovementAt: d('2026-10-10'),
        },
      ]);
    });
  });

  describe('create', () => {
    it('rejects employees outside the company', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);
      await expect(
        service.create('c1', 'admin', {
          userId: 'u9',
          date: '2026-10-01',
          amount: 100,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.employeeAdvance.create).not.toHaveBeenCalled();
    });

    it('creates an ISSUED cash advance by default', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ id: 'uc1' });
      mockPrisma.employeeAdvance.create.mockResolvedValue({ id: 'a1' });
      await service.create('c1', 'admin', {
        userId: 'u1',
        date: '2026-10-01',
        amount: 500,
        note: ' обект Пловдив ',
      });
      expect(mockPrisma.employeeAdvance.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          companyId: 'c1',
          userId: 'u1',
          type: 'ISSUED',
          paymentMethod: 'CASH',
          note: 'обект Пловдив',
          createdById: 'admin',
        }),
      });
    });
  });
});
