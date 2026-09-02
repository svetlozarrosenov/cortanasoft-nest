import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  attendance: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userCompany: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  site: {
    findFirst: jest.fn(),
  },
  leave: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.leave.findFirst.mockResolvedValue(null);
    mockPrisma.leave.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('create', () => {
    const baseDto = {
      date: '2025-06-15',
      type: 'REGULAR',
    };

    it('should create attendance record successfully', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1', companyId: 'c1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockResolvedValue({ id: 'a1', ...baseDto });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'John', lastName: 'Doe', email: 'j@d.com' });

      const result = (await service.create('c1', 'u1', baseDto as any)) as any;
      expect(result.id).toBe('a1');
      expect(result.user).toBeDefined();
    });

    it('should throw BadRequestException when user is not an employee', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([]);

      await expect(service.create('c1', 'u1', baseDto as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate date+site', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create('c1', 'u1', baseDto as any))
        .rejects.toThrow(ConflictException);
    });

    it('refuses a single-day record on a day with an approved leave', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'leave1' });

      await expect(service.create('c1', 'u1', baseDto as any))
        .rejects.toThrow(ConflictException);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should calculate workedMinutes when checkIn and checkOut provided', async () => {
      const dto = {
        ...baseDto,
        checkIn: '2025-06-15T09:00:00Z',
        checkOut: '2025-06-15T17:00:00Z',
        breakMinutes: 30,
      };
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.create('c1', 'u1', dto as any);

      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      // 8 hours = 480 minutes, minus 30 break = 450
      expect(createCall.data.workedMinutes).toBe(450);
    });

    it('should clamp workedMinutes to 0 when negative', async () => {
      const dto = {
        ...baseDto,
        checkIn: '2025-06-15T09:00:00Z',
        checkOut: '2025-06-15T09:05:00Z',
        breakMinutes: 60,
      };
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.create('c1', 'u1', dto as any);

      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      expect(createCall.data.workedMinutes).toBe(0);
    });

    it('should use currentUserId when dto.userId is not provided', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'current-user' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'current-user' });

      await service.create('c1', 'current-user', baseDto as any);

      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe('current-user');
    });

    it('should allow a second timed interval on the same day+site', async () => {
      const dto = { ...baseDto, checkIn: '2025-06-15T13:00:00Z', checkOut: '2025-06-15T17:00:00Z' };
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a2', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.create('c1', 'u1', dto as any);

      // Дубликат се търси само сред записите БЕЗ часове („цял ден")
      const where = mockPrisma.attendance.findFirst.mock.calls[0][0].where;
      expect(where.checkIn).toBeNull();
      expect(mockPrisma.attendance.create).toHaveBeenCalled();
    });

    it('should create for several employees at once (userIds)', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'x', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u' });

      const result = (await service.create('c1', 'me', { ...baseDto, userIds: ['u1', 'u2'] } as any)) as any;

      expect(result).toEqual({ count: 2, users: 2 });
      const created = mockPrisma.attendance.create.mock.calls.map((c) => c[0].data.userId);
      expect(created).toEqual(['u1', 'u2']);
    });

    it('should reject when one of userIds is not an employee', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);

      await expect(service.create('c1', 'me', { ...baseDto, userIds: ['u1', 'ghost'] } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should store the day as UTC midnight regardless of server timezone', () => {
      expect(AttendanceService.dayKey('2025-06-15').toISOString()).toBe('2025-06-15T00:00:00.000Z');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when attendance not found', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return attendance with user info', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'John' });

      const result = await service.findOne('c1', 'a1');
      expect(result.user?.firstName).toBe('John');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for non-existent record', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      await expect(service.update('c1', 'bad', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should recalculate workedMinutes on update', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        checkIn: new Date('2025-06-15T09:00:00Z'),
        checkOut: new Date('2025-06-15T17:00:00Z'),
        breakMinutes: 0,
        workedMinutes: 480,
      });
      mockPrisma.attendance.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'a1', userId: 'u1', ...data }),
      );
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      // Update breakMinutes from 0 to 60
      await service.update('c1', 'a1', { breakMinutes: 60 } as any);

      const updateCall = mockPrisma.attendance.update.mock.calls[0][0];
      // 480 - 60 = 420
      expect(updateCall.data.workedMinutes).toBe(420);
    });
  });

  describe('bulkUpdate', () => {
    it('should reject a site from another company', async () => {
      mockPrisma.site.findFirst.mockResolvedValue(null);
      await expect(
        service.bulkUpdate('c1', { ids: ['a1'], siteId: 'foreign' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.attendance.updateMany).not.toHaveBeenCalled();
    });

    it('should scope updateMany to the company and only touch given fields', async () => {
      mockPrisma.site.findFirst.mockResolvedValue({ id: 's1' });
      mockPrisma.attendance.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdate('c1', { ids: ['a1', 'a2'], siteId: 's1' } as any);

      expect(result).toEqual({ updated: 2 });
      expect(mockPrisma.attendance.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'c1', id: { in: ['a1', 'a2'] } },
        data: { siteId: 's1' },
      });
    });

  });

  describe('remove', () => {
    it('should delete the record', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({ id: 'a1' });
      mockPrisma.attendance.delete.mockResolvedValue({ id: 'a1' });

      const result = await service.remove('c1', 'a1');
      expect(result.success).toBe(true);
      expect(mockPrisma.attendance.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });

    it('should throw NotFoundException when record not found', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      await expect(service.remove('c1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('should count attendance types correctly', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        { type: 'REGULAR', workedMinutes: 480, overtimeMinutes: 0 },
        { type: 'REGULAR', workedMinutes: 480, overtimeMinutes: 60 },
        { type: 'REMOTE', workedMinutes: 450, overtimeMinutes: 0 },
        { type: 'SICK_LEAVE', workedMinutes: null, overtimeMinutes: 0 },
        { type: 'VACATION', workedMinutes: null, overtimeMinutes: 0 },
        { type: 'HALF_DAY', workedMinutes: 240, overtimeMinutes: 0 },
        { type: 'OVERTIME', workedMinutes: 120, overtimeMinutes: 120 },
      ]);

      const result = await service.getSummary('c1', 'u1', '2025-06-01', '2025-06-30');

      expect(result.totalDays).toBe(7);
      expect(result.regularDays).toBe(2);
      expect(result.remoteDays).toBe(1);
      expect(result.sickLeaveDays).toBe(1);
      expect(result.vacationDays).toBe(1);
      expect(result.halfDays).toBe(1);
      expect(result.overtimeDays).toBe(1);
      expect(result.totalWorkedMinutes).toBe(480 + 480 + 450 + 240 + 120);
      expect(result.totalOvertimeMinutes).toBe(60 + 120);
    });

    it('should return zero counts for empty period', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const result = await service.getSummary('c1', 'u1', '2025-06-01', '2025-06-30');
      expect(result.totalDays).toBe(0);
      expect(result.totalWorkedMinutes).toBe(0);
    });
  });

  describe('checkIn', () => {
    it('should create new record when no record exists for today', async () => {
      // 1) няма отворен интервал; 2) няма празен запис за деня
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockResolvedValue({ id: 'a1', checkIn: new Date() });

      const result = await service.checkIn('c1', 'u1');
      expect(result.id).toBe('a1');
      expect(mockPrisma.attendance.create).toHaveBeenCalled();
    });

    it('should update existing record without checkIn', async () => {
      mockPrisma.attendance.findFirst
        .mockResolvedValueOnce(null) // няма отворен интервал
        .mockResolvedValueOnce({ id: 'a1', checkIn: null }); // празен запис
      mockPrisma.attendance.update.mockResolvedValue({ id: 'a1', checkIn: new Date() });

      await service.checkIn('c1', 'u1');
      expect(mockPrisma.attendance.update).toHaveBeenCalled();
    });

    it('should throw ConflictException when already checked in (отворен интервал)', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValueOnce({ id: 'a1', checkIn: new Date(), checkOut: null });

      await expect(service.checkIn('c1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should tag the new record with the site on check-in', async () => {
      mockPrisma.site.findFirst.mockResolvedValue({ id: 's1' });
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'a1', ...data }),
      );

      await service.checkIn('c1', 'u1', 's1');
      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      expect(createCall.data.siteId).toBe('s1');
    });
  });

  describe('checkOut', () => {
    it('should throw NotFoundException when no record for today', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      await expect(service.checkOut('c1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when not checked in', async () => {
      mockPrisma.attendance.findFirst
        .mockResolvedValueOnce(null) // няма отворен интервал
        .mockResolvedValueOnce({ id: 'a1', checkIn: null, checkOut: null });

      await expect(service.checkOut('c1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when already checked out', async () => {
      mockPrisma.attendance.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'a1', checkIn: new Date(), checkOut: new Date() });

      await expect(service.checkOut('c1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should calculate workedMinutes on checkout', async () => {
      const checkInTime = new Date('2025-06-15T09:00:00Z');
      mockPrisma.attendance.findFirst.mockResolvedValueOnce({
        id: 'a1',
        checkIn: checkInTime,
        checkOut: null,
        breakMinutes: 30,
      });
      mockPrisma.attendance.update.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'a1', ...data }),
      );

      await service.checkOut('c1', 'u1');
      expect(mockPrisma.attendance.update).toHaveBeenCalled();
      const updateCall = mockPrisma.attendance.update.mock.calls[0][0];
      // workedMinutes should be >= 0
      expect(updateCall.data.workedMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTodayStatus', () => {
    it('should return not checked in when no record', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const result = await service.getTodayStatus('c1', 'u1');
      expect(result.hasRecord).toBe(false);
      expect(result.isCheckedIn).toBe(false);
      expect(result.isCheckedOut).toBe(false);
    });

    it('should return checked in status', async () => {
      const now = new Date();
      mockPrisma.attendance.findMany.mockResolvedValue([
        { checkIn: now, checkOut: null, workedMinutes: null, type: 'REGULAR', site: null },
      ]);

      const result = await service.getTodayStatus('c1', 'u1');
      expect(result.hasRecord).toBe(true);
      expect(result.isCheckedIn).toBe(true);
      expect(result.isCheckedOut).toBe(false);
    });

    it('should report checked out only when no open interval remains', async () => {
      const now = new Date();
      mockPrisma.attendance.findMany.mockResolvedValue([
        { checkIn: now, checkOut: now, workedMinutes: 180, type: 'REGULAR', site: { id: 's1', name: 'Обект А' } },
        { checkIn: now, checkOut: now, workedMinutes: 240, type: 'REGULAR', site: { id: 's2', name: 'Обект Б' } },
      ]);

      const result = await service.getTodayStatus('c1', 'u1');
      expect(result.isCheckedOut).toBe(true);
      expect(result.workedMinutes).toBe(420);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with enriched user data', async () => {
      mockPrisma.attendance.count.mockResolvedValue(1);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', userId: 'u1', date: new Date('2025-06-16T00:00:00Z') },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'j@d.com', isActive: true },
      ]);

      const result = await service.findAll('c1', { page: 1, limit: 10 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user?.firstName).toBe('John');
      expect(result.data[0].isNonWorkingDay).toBe(false);
      expect(result.meta.total).toBe(1);
    });

    it('flags records on weekends/holidays as non-working days', async () => {
      mockPrisma.attendance.count.mockResolvedValue(2);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'sat', userId: 'u1', date: new Date('2025-06-14T00:00:00Z') },
        { id: 'xmas', userId: 'u1', date: new Date('2025-12-25T00:00:00Z') },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.findAll('c1', { page: 1, limit: 10 } as any);
      expect(result.data.map((r) => r.isNonWorkingDay)).toEqual([true, true]);
    });

    it('returns approved leaves alongside (read-only), scoped to the filter window', async () => {
      mockPrisma.attendance.count.mockResolvedValue(0);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.leave.findMany.mockResolvedValue([{ id: 'l1', type: 'ANNUAL' }]);

      const result = await service.findAll('c1', {
        userId: 'u1', dateFrom: '2025-06-01', dateTo: '2025-06-30', page: 1, limit: 10,
      } as any);
      expect(result.leaves).toEqual([{ id: 'l1', type: 'ANNUAL' }]);
      const where = mockPrisma.leave.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        companyId: 'c1', userId: 'u1', status: 'APPROVED',
        endDate: { gte: new Date('2025-06-01') }, startDate: { lte: new Date('2025-06-30') },
      });
    });

    it('does not mix leaves in when filtering by type/site', async () => {
      mockPrisma.attendance.count.mockResolvedValue(0);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.findAll('c1', { siteId: 's1', page: 1, limit: 10 } as any);
      expect(result.leaves).toEqual([]);
      expect(mockPrisma.leave.findMany).not.toHaveBeenCalled();
    });

    it('summarises working/non-working records over the whole filter, not the page', async () => {
      mockPrisma.attendance.count.mockResolvedValue(3);
      // първата заявка = страницата, втората = всички дати за обобщението
      mockPrisma.attendance.findMany
        .mockResolvedValueOnce([{ id: 'a1', userId: 'u1', date: new Date('2025-06-16T00:00:00Z') }])
        .mockResolvedValueOnce([
          { date: new Date('2025-06-16T00:00:00Z') },
          { date: new Date('2025-06-14T00:00:00Z') },
          { date: new Date('2025-12-25T00:00:00Z') },
        ]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      const result = await service.findAll('c1', { page: 1, limit: 1 } as any);
      expect(result.meta.workingDayRecords).toBe(1);
      expect(result.meta.nonWorkingDayRecords).toBe(2);
    });

    it('should filter by date range', async () => {
      mockPrisma.attendance.count.mockResolvedValue(0);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll('c1', {
        dateFrom: '2025-06-01',
        dateTo: '2025-06-30',
        page: 1,
        limit: 10,
      } as any);

      const whereArg = mockPrisma.attendance.findMany.mock.calls[0][0].where;
      expect(whereArg.date).toBeDefined();
      expect(whereArg.date.gte).toEqual(new Date('2025-06-01'));
      expect(whereArg.date.lte).toEqual(new Date('2025-06-30'));
    });
  });
});
