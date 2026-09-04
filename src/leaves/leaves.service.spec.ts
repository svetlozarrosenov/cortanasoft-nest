import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

const mockPrisma = {
  leave: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  leaveBalance: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  hrSettings: {
    findUnique: jest.fn(),
  },
};

const mockUploads = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
};

const mockPush = {
  sendToUser: jest.fn().mockResolvedValue({ success: 0, failed: 0 }),
  sendToUsers: jest.fn().mockResolvedValue({ success: 0, failed: 0 }),
};

// Future dates so the "no past dates" guard doesn't trip in create tests
const FUTURE_START = '2030-07-01';
const FUTURE_END = '2030-07-05';

// Локална дата на N дни спрямо днес (YYYY-MM-DD) — за тестовете на политиката
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};
// Работна седмица, започваща ~2 седмици назад: понеделник → петък
const recentMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return d;
};
const RECENT_MON = recentMonday().toLocaleDateString('en-CA');
const RECENT_FRI = (() => {
  const d = recentMonday();
  d.setDate(d.getDate() + 4);
  return d.toLocaleDateString('en-CA');
})();
const RECENT_TUE = (() => {
  const d = recentMonday();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA');
})();

describe('LeavesService', () => {
  let service: LeavesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Defaults: company is a CLIENT, employee exists, no approvers, balance empty
    mockPrisma.company.findUnique.mockResolvedValue({
      role: 'CLIENT',
      defaultAnnualLeaveDays: 20,
    });
    mockPrisma.userCompany.findUnique.mockResolvedValue({
      id: 'uc1',
      maxVacationDays: 20,
      role: { permissions: { modules: {} } },
    });
    mockPrisma.userCompany.findMany.mockResolvedValue([]);
    mockPrisma.hrSettings.findUnique.mockResolvedValue(null); // политика по подразбиране (90 / 0)
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveBalance.upsert.mockResolvedValue({
      annualTotal: 20,
      annualTotalOverride: null,
      annualUsed: 0,
      annualCarried: 0,
      sickUsed: 0,
      unpaidUsed: 0,
    });
    mockPrisma.leaveBalance.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadsService, useValue: mockUploads },
        { provide: PushNotificationsService, useValue: mockPush },
      ],
    }).compile();
    service = module.get<LeavesService>(LeavesService);
  });

  describe('create', () => {
    const baseDto = {
      type: 'ANNUAL',
      startDate: FUTURE_START,
      endDate: FUTURE_END,
      days: 5,
      reason: 'Vacation',
    };

    it('should create a leave request successfully', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null); // no overlap
      mockPrisma.leave.create.mockResolvedValue({
        id: 'l1',
        ...baseDto,
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
        status: 'PENDING',
        user: { firstName: 'Ivan', lastName: 'Petrov' },
      });

      const result = await service.create('c1', 'u1', baseDto as any);
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const dto = { ...baseDto, startDate: '2030-07-10', endDate: '2030-07-05' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for a start date in the past (non-privileged)', async () => {
      const dto = { ...baseDto, startDate: '2020-01-06', endDate: '2020-01-10' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('allows a backdated SICK leave for a regular employee (the note comes after the illness)', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      mockPrisma.leave.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data, user: { firstName: 'I', lastName: 'P' } }),
      );
      const dto = { ...baseDto, type: 'SICK', documentNumber: 'E1', startDate: RECENT_MON, endDate: RECENT_FRI };
      const res = await service.create('c1', 'u1', dto as any);
      expect(res.status).toBe('PENDING');
      // 5 работни дни минус евентуален празник в седмицата
      expect(mockPrisma.leave.create.mock.calls[0][0].data.days).toBeGreaterThanOrEqual(4);
    });

    describe('company leave policy (HR > Настройки)', () => {
      const okCreate = () => {
        mockPrisma.leave.findFirst.mockResolvedValue(null);
        mockPrisma.leave.create.mockImplementation(({ data }) =>
          Promise.resolve({ id: 'l1', ...data, user: { firstName: 'I', lastName: 'P' } }),
        );
      };
      const asHr = () =>
        mockPrisma.userCompany.findUnique.mockResolvedValue({
          id: 'uc1',
          role: {
            permissions: {
              modules: { hr: { enabled: true, pages: { leaves: { enabled: true, actions: { edit: true } } } } },
            },
          },
        });

      it('caps backdating at leaveMaxBackdateDays even for HR', async () => {
        asHr();
        mockPrisma.hrSettings.findUnique.mockResolvedValue({ leaveMaxBackdateDays: 30, leaveMinNoticeDays: 0 });
        okCreate();
        await expect(
          service.create('c1', 'hr', { ...baseDto, startDate: daysFromNow(-40), endDate: daysFromNow(-40) } as any),
        ).rejects.toThrow(/най-много 30 дни назад/);
      });

      it('0 = unlimited backdating', async () => {
        asHr();
        mockPrisma.hrSettings.findUnique.mockResolvedValue({ leaveMaxBackdateDays: 0, leaveMinNoticeDays: 0 });
        okCreate();
        const res = await service.create('c1', 'hr', { ...baseDto, startDate: '2020-01-06', endDate: '2020-01-10' } as any);
        expect(res.status).toBe('PENDING');
      });

      it('applies the same cap to an employee sick note', async () => {
        mockPrisma.hrSettings.findUnique.mockResolvedValue({ leaveMaxBackdateDays: 30, leaveMinNoticeDays: 0 });
        okCreate();
        const dto = { ...baseDto, type: 'SICK', documentNumber: 'E1', startDate: '2020-01-06', endDate: '2020-01-10' };
        await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(/най-много 30 дни назад/);
      });

      it('enforces minimum notice for paid leave requested by an employee', async () => {
        mockPrisma.hrSettings.findUnique.mockResolvedValue({ leaveMaxBackdateDays: 90, leaveMinNoticeDays: 7 });
        okCreate();
        await expect(
          service.create('c1', 'u1', { ...baseDto, startDate: daysFromNow(3), endDate: daysFromNow(3) } as any),
        ).rejects.toThrow(/поне 7 дни предварително/);
      });

      it('minimum notice does not apply to HR, nor to unpaid/sick leave', async () => {
        mockPrisma.hrSettings.findUnique.mockResolvedValue({ leaveMaxBackdateDays: 90, leaveMinNoticeDays: 7 });
        okCreate();
        // неплатен „за утре" от служител — минава (7-дневен прозорец, за да има работни дни)
        const unpaid = { ...baseDto, type: 'UNPAID', reason: 'спешно', startDate: daysFromNow(1), endDate: daysFromNow(6) };
        await expect(service.create('c1', 'u1', unpaid as any)).resolves.toBeDefined();
        // HR подава платен отпуск за след 3 дни
        asHr();
        okCreate();
        const soon = { ...baseDto, startDate: daysFromNow(1), endDate: daysFromNow(6) };
        await expect(service.create('c1', 'hr', soon as any)).resolves.toBeDefined();
      });
    });

    it('should require a reason for UNPAID leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      const dto = { ...baseDto, type: 'UNPAID', reason: '' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should require a sick note for SICK leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      const dto = { ...baseDto, type: 'SICK', reason: 'flu' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping leaves', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should forbid filing on behalf of another user when not privileged', async () => {
      const dto = { ...baseDto, userId: 'someone-else' };
      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('stores a substitute who is a member of the company', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      mockPrisma.leave.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'l1', ...data, user: { firstName: 'I', lastName: 'P' } }),
      );
      await service.create('c1', 'u1', { ...baseDto, substituteUserId: 'u2' } as any);
      expect(mockPrisma.leave.create.mock.calls[0][0].data.substituteUserId).toBe('u2');
      expect(mockPrisma.userCompany.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_companyId: { userId: 'u2', companyId: 'c1' } },
        }),
      );
    });

    it('rejects a substitute who is the requester or not in the company', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(
        service.create('c1', 'u1', { ...baseDto, substituteUserId: 'u1' } as any),
      ).rejects.toThrow(BadRequestException);

      // първото findUnique е за правата на подаващия, второто — за заместника
      mockPrisma.userCompany.findUnique
        .mockResolvedValueOnce({ id: 'uc1', role: { permissions: { modules: {} } } })
        .mockResolvedValueOnce(null);
      await expect(
        service.create('c1', 'u1', { ...baseDto, substituteUserId: 'ghost' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return leave when found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      const result = await service.findOne('c1', 'l1');
      expect(result.id).toBe('l1');
    });

    it('should mask sensitive fields of others for non-privileged viewers', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'owner',
        status: 'PENDING',
        reason: 'secret',
        documentNumber: 'E123',
      });
      const result = await service.findOne('c1', 'l1', { userId: 'viewer', privileged: false });
      expect(result.reason).toBeNull();
      expect(result.documentNumber).toBeNull();
    });

    it('should not mask own leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        id: 'l1',
        userId: 'viewer',
        status: 'PENDING',
        reason: 'secret',
      });
      const result = await service.findOne('c1', 'l1', { userId: 'viewer', privileged: false });
      expect(result.reason).toBe('secret');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when updating another users leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'other-user', status: 'PENDING' });
      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when leave is not PENDING', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'APPROVED' });
      await expect(service.update('c1', 'l1', 'u1', {} as any)).rejects.toThrow(BadRequestException);
    });

    const pending = {
      id: 'l1',
      userId: 'u1',
      status: 'PENDING',
      type: 'ANNUAL',
      startDate: new Date(FUTURE_START),
      endDate: new Date(FUTURE_END),
      halfDay: false,
    };

    it('should update a PENDING leave for own user', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(pending);
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', reason: 'Updated' });
      const result = await service.update('c1', 'l1', 'u1', { reason: 'Updated' } as any);
      expect(result.reason).toBe('Updated');
    });

    it('refuses moving a pending request into the past (same rule as create)', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(pending);
      await expect(
        service.update('c1', 'l1', 'u1', { startDate: '2020-01-06', endDate: '2020-01-07' } as any),
      ).rejects.toThrow('Началната дата не може да е в миналото');
      expect(mockPrisma.leave.update).not.toHaveBeenCalled();
    });

    it('recomputes working days on update instead of trusting the client', async () => {
      mockPrisma.leave.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce(null);
      mockPrisma.leave.update.mockImplementation(({ data }) => Promise.resolve({ id: 'l1', ...data }));
      // 2030-07-01 (пн) – 2030-07-12 (пт) = 10 работни дни; клиентът твърди 1
      await service.update('c1', 'l1', 'u1', { endDate: '2030-07-12', days: 1 } as any);
      expect(mockPrisma.leave.update.mock.calls[0][0].data.days).toBe(10);
    });

    it('checks overlap with other requests when dates change (excluding itself)', async () => {
      mockPrisma.leave.findFirst.mockResolvedValueOnce(pending).mockResolvedValueOnce({ id: 'l2' });
      await expect(
        service.update('c1', 'l1', 'u1', { endDate: '2030-07-12' } as any),
      ).rejects.toThrow('You already have a leave request for this period');
      expect(mockPrisma.leave.findFirst.mock.calls[1][0].where.id).toEqual({ not: 'l1' });
    });

    it('allows a sick leave to be backdated by the employee', async () => {
      mockPrisma.leave.findFirst.mockResolvedValueOnce({ ...pending, type: 'SICK', documentNumber: 'E1' }).mockResolvedValueOnce(null);
      mockPrisma.leave.update.mockImplementation(({ data }) => Promise.resolve({ id: 'l1', ...data }));
      const res = await service.update('c1', 'l1', 'u1', { startDate: RECENT_MON, endDate: RECENT_TUE } as any);
      expect(res.days).toBeGreaterThanOrEqual(1);
    });

    it('skips the date policy when only the note changes on an old leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValueOnce({
        ...pending,
        startDate: new Date('2020-01-06'),
        endDate: new Date('2020-01-10'),
      });
      mockPrisma.leave.update.mockImplementation(({ data }) => Promise.resolve({ id: 'l1', ...data }));
      await expect(
        service.update('c1', 'l1', 'u1', { reason: 'уточнение' } as any),
      ).resolves.toBeDefined();
      expect(mockPrisma.hrSettings.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    const annualLeave = {
      id: 'l1',
      userId: 'u1',
      status: 'PENDING',
      type: 'ANNUAL',
      days: 5,
      halfDay: false,
      startDate: new Date(FUTURE_START),
      endDate: new Date(FUTURE_END),
    };

    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.approve('c1', 'bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'APPROVED' });
      await expect(service.approve('c1', 'l1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should forbid self-approval', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      await expect(service.approve('c1', 'l1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw when annual balance is insufficient', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      mockPrisma.leaveBalance.upsert.mockResolvedValue({
        annualTotal: 0,
        annualTotalOverride: null,
        annualUsed: 0,
        annualCarried: 0,
      });
      await expect(service.approve('c1', 'l1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should decrement balance and set approver on approve', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(annualLeave);
      mockPrisma.leave.update.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'APPROVED',
        type: 'ANNUAL',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
      });

      await service.approve('c1', 'l1', 'admin1');

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { increment: expect.any(Number) } },
        }),
      );
      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedById: 'admin1' }),
        }),
      );
      expect(mockPush.sendToUser).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.reject('c1', 'bad', 'admin', { rejectionNote: 'No' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-PENDING leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', status: 'APPROVED' });
      await expect(service.reject('c1', 'l1', 'admin', { rejectionNote: 'No' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should forbid self-rejection', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      await expect(service.reject('c1', 'l1', 'u1', { rejectionNote: 'x' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should set status to REJECTED with rejectionNote', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'u1', status: 'PENDING' });
      mockPrisma.leave.update.mockResolvedValue({
        id: 'l1',
        userId: 'u1',
        status: 'REJECTED',
        type: 'ANNUAL',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
      });

      await service.reject('c1', 'l1', 'admin', { rejectionNote: 'Not enough staff' } as any);

      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectionNote: 'Not enough staff',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    const employee = { userId: 'u1', privileged: false };
    const hr = { userId: 'hr1', privileged: true };
    const approvedFuture = {
      id: 'l1',
      userId: 'u1',
      status: 'APPROVED',
      type: 'ANNUAL',
      halfDay: false,
      days: 5,
      startDate: new Date(FUTURE_START),
      endDate: new Date(FUTURE_END),
    };

    it('should throw NotFoundException when leave not found', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(null);
      await expect(service.cancel('c1', 'bad', employee)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when an employee cancels another users leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'l1', userId: 'other-user', status: 'PENDING' });
      await expect(service.cancel('c1', 'l1', employee)).rejects.toThrow(ForbiddenException);
    });

    it('should reverse balance when cancelling an approved annual leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(approvedFuture);
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', employee);

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { increment: expect.any(Number) } },
        }),
      );
    });

    it('should let an employee withdraw a pending request even for a past date', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        ...approvedFuture,
        status: 'PENDING',
        startDate: new Date(RECENT_MON),
        endDate: new Date(RECENT_TUE),
      });
      mockPrisma.leave.update.mockResolvedValue({ id: 'l1', status: 'CANCELLED' });

      await service.cancel('c1', 'l1', employee);

      expect(mockPrisma.leave.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
    });

    it('should not let an employee cancel an approved leave that has already started', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        ...approvedFuture,
        startDate: new Date(RECENT_MON),
        endDate: new Date(RECENT_FRI),
      });

      await expect(service.cancel('c1', 'l1', employee)).rejects.toThrow(
        /Започнал или минал отпуск/,
      );
      expect(mockPrisma.leave.update).not.toHaveBeenCalled();
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
    });

    it('should let HR cancel someone else\'s past approved leave and notify them', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({
        ...approvedFuture,
        startDate: new Date(RECENT_MON),
        endDate: new Date(RECENT_FRI),
      });
      mockPrisma.leave.update.mockResolvedValue({
        ...approvedFuture,
        status: 'CANCELLED',
        startDate: new Date(RECENT_MON),
        endDate: new Date(RECENT_FRI),
      });

      await service.cancel('c1', 'l1', hr);

      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { annualUsed: { increment: expect.any(Number) } },
        }),
      );
      expect(mockPush.sendToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ title: 'Анулиран отпуск' }),
      );
    });

    it('should not notify when the employee withdraws their own request', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue(approvedFuture);
      mockPrisma.leave.update.mockResolvedValue({ ...approvedFuture, status: 'CANCELLED' });

      await service.cancel('c1', 'l1', employee);

      expect(mockPush.sendToUser).not.toHaveBeenCalled();
    });

    it('should reject cancelling an already rejected leave', async () => {
      mockPrisma.leave.findFirst.mockResolvedValue({ ...approvedFuture, status: 'REJECTED' });
      await expect(service.cancel('c1', 'l1', hr)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll filters', () => {
    const run = async (query: any) => {
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.leave.count.mockResolvedValue(0);
      await service.findAll('c1', query);
      return mockPrisma.leave.findMany.mock.calls[0][0];
    };

    it('treats the period filter as overlap, not containment', async () => {
      const args = await run({ startDate: '2026-01-01', endDate: '2026-12-31' });
      expect(args.where.startDate).toEqual({ lte: new Date('2026-12-31') });
      expect(args.where.endDate).toEqual({ gte: new Date('2026-01-01') });
    });

    it('scope=upcoming keeps leaves that have not ended yet', async () => {
      const args = await run({ scope: 'upcoming' });
      const gte = args.where.endDate.gte as Date;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(gte.getTime()).toBe(today.getTime());
      expect(args.where.startDate).toBeUndefined();
    });

    it('scope=past keeps only leaves that ended before today', async () => {
      const args = await run({ scope: 'past' });
      expect(args.where.endDate.lt).toBeInstanceOf(Date);
      expect(args.where.endDate.gte).toBeUndefined();
    });

    it('scope=upcoming inside a year keeps the later of the two lower bounds', async () => {
      const args = await run({ scope: 'upcoming', startDate: '2099-01-01', endDate: '2099-12-31' });
      expect(args.where.endDate.gte).toEqual(new Date('2099-01-01'));
    });

    it('sorts by startDate when asked', async () => {
      const args = await run({ sortBy: 'startDate', sortOrder: 'asc' });
      expect(args.orderBy).toEqual({ startDate: 'asc' });
    });
  });

  describe('findWhoIsOut', () => {
    const rows = [
      {
        id: 'l1',
        userId: 'u2',
        type: 'SICK',
        status: 'APPROVED',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_END),
        user: { firstName: 'Георги', lastName: 'Иванов' },
      },
      {
        id: 'l2',
        userId: 'u1',
        type: 'ANNUAL',
        status: 'PENDING',
        startDate: new Date(FUTURE_START),
        endDate: new Date(FUTURE_START),
        user: { firstName: 'Аз', lastName: 'Самият' },
      },
    ];

    it('queries overlapping pending/approved leaves and excludes a user', async () => {
      mockPrisma.leave.findMany.mockResolvedValue([]);
      await service.findWhoIsOut(
        'c1',
        FUTURE_START,
        FUTURE_END,
        { userId: 'u1', privileged: false },
        'u1',
      );
      const where = mockPrisma.leave.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['PENDING', 'APPROVED'] });
      expect(where.startDate).toEqual({ lte: new Date(FUTURE_END) });
      expect(where.endDate).toEqual({ gte: new Date(FUTURE_START) });
      expect(where.userId).toEqual({ not: 'u1' });
    });

    it("hides colleagues' leave type from a regular employee but not their own", async () => {
      mockPrisma.leave.findMany.mockResolvedValue(rows);
      const res = await service.findWhoIsOut('c1', FUTURE_START, FUTURE_END, {
        userId: 'u1',
        privileged: false,
      });
      expect(res[0].type).toBeNull();
      expect(res[1].type).toBe('ANNUAL');
    });

    it('shows leave types to HR', async () => {
      mockPrisma.leave.findMany.mockResolvedValue(rows);
      const res = await service.findWhoIsOut('c1', FUTURE_START, FUTURE_END, {
        userId: 'hr',
        privileged: true,
      });
      expect(res.map((r) => r.type)).toEqual(['SICK', 'ANNUAL']);
    });

    it('rejects an unparsable date', async () => {
      await expect(
        service.findWhoIsOut('c1', 'nope', FUTURE_END, {
          userId: 'u1',
          privileged: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBalance', () => {
    it('should return a computed balance structure', async () => {
      mockPrisma.leaveBalance.upsert.mockResolvedValue({
        annualTotal: 20,
        annualTotalOverride: null,
        annualUsed: 5,
        annualCarried: 2,
        sickUsed: 1,
        unpaidUsed: 0,
      });

      const balance = await service.getBalance('c1', 'u1', 2030);
      expect(balance.annual.total).toBe(22);
      expect(balance.annual.remaining).toBe(17);
      expect(balance.annual.used).toBe(5);
    });
  });
});
