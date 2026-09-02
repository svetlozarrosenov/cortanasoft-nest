import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../prisma/prisma.service';
import { HrSettingsService } from '../hr-settings/hr-settings.service';

const mockHrSettings = { getWorkDayHours: jest.fn().mockResolvedValue(8) };

const mockPrisma = {
  attendance: { findMany: jest.fn() },
  leave: { findMany: jest.fn() },
  employmentContract: { findFirst: jest.fn() },
  payroll: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  payrollItem: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  userCompany: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('PayrollService', () => {
  let service: PayrollService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HrSettingsService, useValue: mockHrSettings },
      ],
    }).compile();
    service = module.get<PayrollService>(PayrollService);
  });

  describe('create', () => {
    const baseDto = { userId: 'u1', year: 2026, month: 1, baseSalary: 3000 };

    it('should create payroll with correct gross/net (base salary only)', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      mockPrisma.payroll.findUnique.mockResolvedValue(null);
      mockPrisma.payroll.create.mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'John', lastName: 'Doe' });

      const result = await service.create('c1', baseDto as any);
      expect(result.grossSalary).toBe(3000);
      expect(result.netSalary).toBe(3000);
    });

    it('should calculate correctly with all additions and deductions', async () => {
      const dto = {
        ...baseDto,
        overtimePay: 500,
        bonuses: 200,
        allowances: 100,
        commissions: 50,
        taxDeductions: 400,
        insuranceEmployee: 300,
        otherDeductions: 50,
      };
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u1' });
      mockPrisma.payroll.findUnique.mockResolvedValue(null);
      mockPrisma.payroll.create.mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      const result = await service.create('c1', dto as any);
      // gross = 3000 + 500 + 200 + 100 + 50 = 3850
      // deductions = 400 + 300 + 50 = 750
      // net = 3850 - 750 = 3100
      expect(result.grossSalary).toBe(3850);
      expect(result.netSalary).toBe(3100);
    });

    it('should throw BadRequestException for non-employee', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);
      await expect(service.create('c1', baseDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate period', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ userId: 'u1' });
      mockPrisma.payroll.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create('c1', baseDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    it('should approve DRAFT payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.payroll.update.mockResolvedValue({ id: 'p1', status: 'APPROVED', approvedById: 'approver1' });

      const result = await service.approve('c1', 'p1', 'approver1');
      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.payroll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedById: 'approver1',
          }),
        }),
      );
    });

    it('should approve PENDING payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'PENDING' });
      mockPrisma.payroll.update.mockResolvedValue({ id: 'p1', status: 'APPROVED' });

      const result = await service.approve('c1', 'p1', 'approver1');
      expect(result.status).toBe('APPROVED');
    });

    it('should throw BadRequestException when approving PAID payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'PAID' });
      await expect(service.approve('c1', 'p1', 'a1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when approving APPROVED payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      await expect(service.approve('c1', 'p1', 'a1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsPaid', () => {
    it('should mark APPROVED payroll as paid', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      mockPrisma.payroll.update.mockResolvedValue({ id: 'p1', status: 'PAID', paymentReference: 'REF001' });

      const result = await service.markAsPaid('c1', 'p1', 'REF001');
      expect(result.status).toBe('PAID');
    });

    it('should throw BadRequestException marking non-APPROVED as paid', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      await expect(service.markAsPaid('c1', 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel DRAFT payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.payroll.update.mockResolvedValue({ id: 'p1', status: 'CANCELLED' });

      const result = await service.cancel('c1', 'p1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel APPROVED payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      mockPrisma.payroll.update.mockResolvedValue({ id: 'p1', status: 'CANCELLED' });

      const result = await service.cancel('c1', 'p1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException when cancelling PAID payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'PAID' });
      await expect(service.cancel('c1', 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete DRAFT payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      mockPrisma.payroll.delete.mockResolvedValue({});

      const result = await service.remove('c1', 'p1');
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when deleting non-DRAFT payroll', async () => {
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      await expect(service.remove('c1', 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateBulk', () => {
    it('should create payroll for employees and skip existing', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([
        { userId: 'u1', user: { id: 'u1', firstName: 'John', lastName: 'Doe' } },
        { userId: 'u2', user: { id: 'u2', firstName: 'Jane', lastName: 'Smith' } },
        { userId: 'u3', user: { id: 'u3', firstName: 'Bob', lastName: 'Brown' } },
      ]);
      // u1 already has payroll, u2 and u3 don't
      mockPrisma.payroll.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // u1 - exists
        .mockResolvedValueOnce(null) // u2 - doesn't exist
        .mockResolvedValueOnce(null); // u3 - doesn't exist

      mockPrisma.payroll.create
        .mockResolvedValueOnce({ id: 'new1', userId: 'u2' })
        .mockResolvedValueOnce({ id: 'new2', userId: 'u3' });

      const result = await service.generateBulk('c1', 2026, 1, 2000);
      expect(result.created).toHaveLength(2);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].userId).toBe('u1');
      expect(result.skipped[0].reason).toBe('Already exists');
    });

    it('should handle empty company (no employees)', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([]);

      const result = await service.generateBulk('c1', 2026, 1, 2000);
      expect(result.created).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    it('should return correct aggregation', async () => {
      mockPrisma.payroll.findMany.mockResolvedValue([
        { grossSalary: 3000, netSalary: 2500, taxDeductions: 300, insuranceEmployee: 200, insuranceEmployer: 150, bonuses: 100, status: 'PAID' },
        { grossSalary: 4000, netSalary: 3200, taxDeductions: 500, insuranceEmployee: 300, insuranceEmployer: 250, bonuses: 200, status: 'DRAFT' },
        { grossSalary: 2000, netSalary: 1800, taxDeductions: 100, insuranceEmployee: 100, insuranceEmployer: 80, bonuses: 0, status: 'PAID' },
      ]);

      const result = await service.getSummary('c1', 2026, 1);
      expect(result.totalRecords).toBe(3);
      expect(result.totalGrossSalary).toBe(9000);
      expect(result.totalNetSalary).toBe(7500);
      expect(result.totalTaxDeductions).toBe(900);
      expect(result.totalInsuranceEmployee).toBe(600);
      expect(result.totalInsuranceEmployer).toBe(480);
      expect(result.totalBonuses).toBe(300);
      expect(result.statusCounts.PAID).toBe(2);
      expect(result.statusCounts.DRAFT).toBe(1);
    });

    it('should handle empty results', async () => {
      mockPrisma.payroll.findMany.mockResolvedValue([]);

      const result = await service.getSummary('c1', 2026);
      expect(result.totalRecords).toBe(0);
      expect(result.totalGrossSalary).toBe(0);
    });
  });

  describe('suggest', () => {
    const d = (day: number) => new Date(Date.UTC(2026, 8, day));

    beforeEach(() => {
      mockHrSettings.getWorkDayHours.mockResolvedValue(8);
      mockPrisma.payroll.findFirst.mockResolvedValue(null);
      mockPrisma.employmentContract.findFirst.mockResolvedValue(null);
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
    });

    it('rejects a non-member', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue(null);
      await expect(service.suggest('c1', 'u1', 2026, 9)).rejects.toThrow(BadRequestException);
    });

    it('counts a day once even with records on two sites and prices it by daily rate', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ hourlyRate: 12.5, position: { hourlyRate: 10 } });
      mockPrisma.attendance.findMany.mockResolvedValue([
        { date: d(1) }, { date: d(1) }, { date: d(2) }, { date: d(3) },
      ]);
      const r = await service.suggest('c1', 'u1', 2026, 9);
      // Септември 2026: 22 делника − 7.09 (пренесен от неделя 6.09) − 22.09 = 20
      expect(r.workingDays).toBe(20);
      expect(r.workedDays).toBe(3);
      expect(r.dailyRate).toBe(100);
      expect(r.baseSalary).toBe(300);
      expect(r.source).toBe('attendance');
    });

    it('falls back to position rate, then to the contract (latest annex wins)', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ hourlyRate: null, position: { hourlyRate: 10 } });
      mockPrisma.attendance.findMany.mockResolvedValue([{ date: d(1) }]);
      let r = await service.suggest('c1', 'u1', 2026, 9);
      expect(r.dailyRate).toBe(80);
      expect(r.baseSalary).toBe(80);

      mockPrisma.userCompany.findFirst.mockResolvedValue({ hourlyRate: null, position: null });
      mockPrisma.employmentContract.findFirst.mockResolvedValue({ salary: 2000, annexes: [{ newSalary: 2400 }] });
      r = await service.suggest('c1', 'u1', 2026, 9);
      expect(r.dailyRate).toBeNull();
      expect(r.contractSalary).toBe(2400);
      expect(r.baseSalary).toBe(2400);
      expect(r.source).toBe('contract');
    });

    it('splits approved leaves by type over working days only', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ hourlyRate: null, position: null });
      mockPrisma.leave.findMany.mockResolvedValue([
        // пт 4.09 → пн 7.09 (7.09 е почивен заради пренесения 6.09): само 4.09 се брои
        { type: 'ANNUAL', startDate: d(4), endDate: d(7), halfDay: false },
        { type: 'SICK', startDate: d(10), endDate: d(10), halfDay: true },
        { type: 'UNPAID', startDate: d(14), endDate: d(15), halfDay: false },
      ]);
      const r = await service.suggest('c1', 'u1', 2026, 9);
      expect(r.leaveDays).toEqual({ vacation: 1, sick: 0.5, unpaid: 2, other: 0 });
      expect(r.baseSalary).toBeNull();
      expect(r.source).toBeNull();
    });

    it('reports an existing non-cancelled payroll for the period', async () => {
      mockPrisma.userCompany.findFirst.mockResolvedValue({ hourlyRate: null, position: null });
      mockPrisma.payroll.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      const r = await service.suggest('c1', 'u1', 2026, 9);
      expect(r.existing).toEqual({ id: 'p1', status: 'DRAFT' });
    });
  });
});
