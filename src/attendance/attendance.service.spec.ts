import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { HrSettingsService } from '../hr-settings/hr-settings.service';

const mockPrisma = {
  attendance: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
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
  payroll: {
    findMany: jest.fn(),
  },
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.leave.findFirst.mockResolvedValue(null);
    mockPrisma.leave.findMany.mockResolvedValue([]);
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.payroll.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: HrSettingsService,
          useValue: {
            getWorkDayHours: jest.fn().mockResolvedValue(8),
            get: jest.fn().mockResolvedValue({ breakMinutes: 60 }),
          },
        },
      ],
    }).compile();
    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('create', () => {
    const baseDto = {
      date: '2025-06-15',
      type: 'REGULAR',
      userId: 'u1',
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

    describe('allocateBreak (day-level break rule)', () => {
    const seg = (from: string, to: string) => ({
      checkIn: new Date(`2025-06-15T${from}:00Z`),
      checkOut: new Date(`2025-06-15T${to}:00Z`),
    });

    it('deducts the full break from a single 8h+ segment', () => {
      expect(AttendanceService.allocateBreak([seg('08:00', '17:00')], 60)).toEqual([60]);
    });

    it('deducts nothing from a short day', () => {
      expect(AttendanceService.allocateBreak([seg('08:00', '12:00')], 60)).toEqual([0]);
    });

    it('treats a gap between segments as the break (punch cancels deduct)', () => {
      expect(AttendanceService.allocateBreak([seg('08:00', '12:00'), seg('13:00', '17:00')], 60)).toEqual([
        0, 0,
      ]);
    });

    it('deducts only what the gap does not cover, on the longest segment', () => {
      expect(AttendanceService.allocateBreak([seg('08:00', '12:00'), seg('12:30', '17:30')], 60)).toEqual([
        0, 30,
      ]);
    });

    it('puts the break on the longest segment when segments touch', () => {
      expect(AttendanceService.allocateBreak([seg('13:00', '17:00'), seg('08:00', '13:00')], 60)).toEqual([
        0, 60,
      ]);
    });

    it('never deducts more than the segment holds', () => {
      // 5 сегмента по 1:15 с 15 мин между тях = 6:15 работа, дупки 60 → нищо
      const five = ['08:00', '09:30', '11:00', '12:30', '14:00'].map((h) => {
        const [hh, mm] = h.split(':').map(Number);
        const end = `${String(hh + 1).padStart(2, '0')}:${String(mm + 15).padStart(2, '0')}`;
        return seg(h, end);
      });
      expect(AttendanceService.allocateBreak(five, 60)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('second segment on the same day', () => {
      const morning = {
        id: 'a-morning',
        checkIn: new Date('2025-06-15T05:00:00Z'), // 08:00 София
        checkOut: new Date('2025-06-15T09:00:00Z'), // 12:00 София
        site: { name: 'Люлин' },
      };
      beforeEach(() => {
        mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
        mockPrisma.attendance.create.mockImplementation(({ data }) =>
          Promise.resolve({ id: 'a2', ...data }),
        );
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      });

      it('allows a timed, non-overlapping second segment (another site)', async () => {
        mockPrisma.attendance.findMany.mockResolvedValue([morning]);

        const res = (await service.create('c1', 'me', {
          ...baseDto,
          siteId: undefined,
          checkIn: '2025-06-15T09:30:00Z',
          checkOut: '2025-06-15T14:00:00Z',
        } as any)) as any;

        expect(res.id).toBe('a2');
        expect(mockPrisma.attendance.create).toHaveBeenCalledTimes(1);
      });

      it('refuses a second segment without hours', async () => {
        mockPrisma.attendance.findMany.mockResolvedValue([morning]);

        await expect(service.create('c1', 'me', baseDto as any)).rejects.toThrow(
          /Вече има присъствие за този ден \(08:00–12:00 \(Люлин\)\)/,
        );
        expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
      });

      it('refuses overlapping hours and names the clashing segment', async () => {
        mockPrisma.attendance.findMany.mockResolvedValue([morning]);

        await expect(
          service.create('c1', 'me', {
            ...baseDto,
            checkIn: '2025-06-15T08:00:00Z', // 11:00 — вътре в 08–12
            checkOut: '2025-06-15T14:00:00Z',
          } as any),
        ).rejects.toThrow(/застъпват с 08:00–12:00 \(Люлин\)/);
        expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
      });

      it('refuses when the existing record is a whole day (no hours)', async () => {
        mockPrisma.attendance.findMany.mockResolvedValue([
          { id: 'whole', checkIn: null, checkOut: null, site: null },
        ]);

        await expect(
          service.create('c1', 'me', {
            ...baseDto,
            checkIn: '2025-06-15T09:30:00Z',
            checkOut: '2025-06-15T14:00:00Z',
          } as any),
        ).rejects.toThrow(/отбелязан като цял ден/);
      });
    });

    it('refuses a single-day record on a day with an approved leave', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.leave.findFirst.mockResolvedValue({ id: 'leave1' });

      await expect(service.create('c1', 'u1', baseDto as any))
        .rejects.toThrow(ConflictException);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('stores the gross span on create and lets the day rule deduct the break', async () => {
      const dto = {
        ...baseDto,
        checkIn: '2025-06-15T09:00:00Z',
        checkOut: '2025-06-15T17:00:00Z',
        breakMinutes: 30, // игнорира се — почивката е правило на деня
      };
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
      // 1) проверка за съществуващи; 2) затворените сегменти за преизчислението
      mockPrisma.attendance.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'a1',
            checkIn: new Date('2025-06-15T09:00:00Z'),
            checkOut: new Date('2025-06-15T17:00:00Z'),
            breakMinutes: 0,
            workedMinutes: 480,
          },
        ]);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      const result = (await service.create('c1', 'u1', dto as any)) as any;

      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      expect(createCall.data.workedMinutes).toBe(480);
      expect(createCall.data.breakMinutes).toBeUndefined();
      // 8 ч ≥ 6 ч → 60 мин от настройките
      expect(mockPrisma.attendance.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { breakMinutes: 60, workedMinutes: 420 },
      });
      expect(result.workedMinutes).toBe(420);
      expect(result.breakMinutes).toBe(60);
    });

    it('should clamp workedMinutes to 0 when negative', async () => {
      const dto = {
        ...baseDto,
        checkIn: '2025-06-15T09:00:00Z',
        checkOut: '2025-06-15T09:00:00Z',
      };
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'a1', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.create('c1', 'u1', dto as any);

      const createCall = mockPrisma.attendance.create.mock.calls[0][0];
      expect(createCall.data.workedMinutes).toBe(0);
    });

    it('refuses a record without an employee instead of defaulting to the current user', async () => {
      await expect(
        service.create('c1', 'current-user', { date: '2025-06-15', type: 'REGULAR' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should create for several employees at once (userIds)', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
      mockPrisma.attendance.findFirst.mockResolvedValue(null);
      mockPrisma.attendance.create.mockImplementation(({ data }) => Promise.resolve({ id: 'x', ...data }));
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u' });

      const result = (await service.create('c1', 'me', { ...baseDto, userIds: ['u1', 'u2'] } as any)) as any;

      expect(result).toEqual({ count: 2, users: 2, skippedCount: 0 });
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

    it('refuses future dates — single day, range end and picked days alike', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const today = AttendanceService.todayKey();

      for (const dto of [
        { ...baseDto, date: dayAfter },
        { ...baseDto, date: today, dateTo: dayAfter },
        { ...baseDto, dates: [today, dayAfter] },
        { ...baseDto, date: tomorrow, userIds: ['u1', 'u2'] },
      ]) {
        await expect(service.create('c1', 'me', dto as any)).rejects.toThrow(
          'Присъствие не може да се отбелязва за бъдеща дата',
        );
      }
      // Отхвърля се преди каквато и да е заявка към базата
      expect(mockPrisma.userCompany.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('applies the shared from/to hours and the settings break to every picked day', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.attendance.createMany.mockResolvedValue({ count: 2 });

      const res = await service.create('c1', 'me', {
        ...baseDto,
        dates: ['2025-06-16', '2025-06-17'],
        startTime: '08:00',
        endTime: '17:00',
      } as any);

      expect(res).toEqual({ count: 2, skipped: [] });
      const rows = mockPrisma.attendance.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(2);
      // 08:00–17:00 българско лятно време (UTC+3) = 05:00–14:00Z
      expect(rows[0].checkIn.toISOString()).toBe('2025-06-16T05:00:00.000Z');
      expect(rows[0].checkOut.toISOString()).toBe('2025-06-16T14:00:00.000Z');
      expect(rows[1].checkIn.toISOString()).toBe('2025-06-17T05:00:00.000Z');
      // 9 ч − 60 мин почивка от HR > Настройки
      expect(rows.every((r: any) => r.breakMinutes === 60 && r.workedMinutes === 480)).toBe(true);
    });

    it('skips already recorded days and reports them with the existing segments', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          date: new Date('2025-06-17T00:00:00Z'),
          checkIn: new Date('2025-06-17T07:00:00Z'),
          checkOut: new Date('2025-06-17T09:00:00Z'),
          site: { name: 'Люлин' },
        },
      ]);
      mockPrisma.attendance.createMany.mockResolvedValue({ count: 2 });

      const res = (await service.create('c1', 'me', {
        ...baseDto,
        dates: ['2025-06-16', '2025-06-17', '2025-06-18'],
      } as any)) as any;

      expect(res.count).toBe(2);
      expect(res.skipped).toEqual([
        { date: '2025-06-17', reason: 'recorded', existing: '10:00–12:00 (Люлин)' },
      ]);
      const rows = mockPrisma.attendance.createMany.mock.calls[0][0].data;
      expect(rows.map((r: any) => r.date.toISOString().slice(0, 10))).toEqual([
        '2025-06-16',
        '2025-06-18',
      ]);
    });

    it('leaves picked days without hours when from/to are not given (whole day)', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.attendance.createMany.mockResolvedValue({ count: 1 });

      await service.create('c1', 'me', { ...baseDto, dates: ['2025-06-16'] } as any);

      const row = mockPrisma.attendance.createMany.mock.calls[0][0].data[0];
      expect(row.checkIn).toBeUndefined();
      expect(row.workedMinutes).toBeUndefined();
    });

    it('applies the hours across a from–to range too, per working day', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([{ userId: 'u1' }]);
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.attendance.createMany.mockResolvedValue({ count: 5 });

      // Понеделник–неделя → 5 работни дни
      await service.create('c1', 'me', {
        ...baseDto,
        date: '2025-06-16',
        dateTo: '2025-06-22',
        startTime: '09:00',
        endTime: '13:00',
      } as any);

      const rows = mockPrisma.attendance.createMany.mock.calls[0][0].data;
      expect(rows).toHaveLength(5);
      expect(rows[4].checkIn.toISOString()).toBe('2025-06-20T06:00:00.000Z');
      expect(rows[4].workedMinutes).toBe(240);
    });

    it('converts Sofia wall-clock time per date, respecting DST on both sides', () => {
      // Зимно време UTC+2
      expect(AttendanceService.sofiaTimeToDate('2025-01-15', '08:00').toISOString()).toBe(
        '2025-01-15T06:00:00.000Z',
      );
      // Лятно време UTC+3
      expect(AttendanceService.sofiaTimeToDate('2025-07-15', '08:00').toISOString()).toBe(
        '2025-07-15T05:00:00.000Z',
      );
      // Денят на смяната (30.03.2025, 03:00 → 04:00): следобедът вече е UTC+3
      expect(AttendanceService.sofiaTimeToDate('2025-03-30', '17:00').toISOString()).toBe(
        '2025-03-30T14:00:00.000Z',
      );
    });

    it('computes "today" in Sofia time, not server UTC', () => {
      // 23:30 UTC на 15.06 е вече 16.06 в София (UTC+3 през лятото)
      expect(AttendanceService.todayKey(new Date('2025-06-15T23:30:00Z'))).toBe('2025-06-16');
      expect(AttendanceService.todayKey(new Date('2025-06-15T12:00:00Z'))).toBe('2025-06-15');
    });
  });

  describe('getDayInfo', () => {
    it('marks days that already have a record so the form can block them', async () => {
      mockPrisma.leave.findMany.mockResolvedValue([]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { date: new Date('2025-06-03T00:00:00Z') },
      ]);

      const { days } = await service.getDayInfo('c1', 'u1', '2025-06-02', '2025-06-04');
      expect(days.map((d) => [d.date, d.hasAttendance])).toEqual([
        ['2025-06-02', false],
        ['2025-06-03', true],
        ['2025-06-04', false],
      ]);
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
    it('refuses hours that overlap a sibling segment of the same day', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({
        id: 'a2',
        userId: 'u1',
        date: new Date('2025-06-15T00:00:00Z'),
        checkIn: new Date('2025-06-15T09:30:00Z'),
        checkOut: new Date('2025-06-15T14:00:00Z'),
        breakMinutes: 0,
        workedMinutes: 270,
      });
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          checkIn: new Date('2025-06-15T05:00:00Z'),
          checkOut: new Date('2025-06-15T09:00:00Z'),
          site: { name: 'Люлин' },
        },
      ]);

      await expect(
        service.update('c1', 'a2', { checkIn: '2025-06-15T08:00:00Z' } as any),
      ).rejects.toThrow(ConflictException);
      // Търсят се само другите записи за същия човек и ден
      expect(mockPrisma.attendance.findMany.mock.calls[0][0].where).toMatchObject({
        companyId: 'c1',
        userId: 'u1',
        id: { not: 'a2' },
      });
      expect(mockPrisma.attendance.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent record', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue(null);

      await expect(service.update('c1', 'bad', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('recalculates the whole day on update: the break moves to the longest segment', async () => {
      const date = new Date('2025-06-15T00:00:00Z');
      mockPrisma.attendance.findFirst.mockResolvedValue({
        id: 'a2',
        userId: 'u1',
        date,
        checkIn: new Date('2025-06-15T10:00:00Z'),
        checkOut: new Date('2025-06-15T12:00:00Z'),
        breakMinutes: 0,
        workedMinutes: 120,
      });
      // 1) съседи за застъпване; 2) затворени сегменти за преизчислението:
      // 05–09 (4 ч) + новият 09–15 (6 ч), допрени → 60 мин върху дългия
      mockPrisma.attendance.findMany
        .mockResolvedValueOnce([
          { checkIn: new Date('2025-06-15T05:00:00Z'), checkOut: new Date('2025-06-15T09:00:00Z'), site: null },
        ])
        .mockResolvedValueOnce([
          { id: 'a1', checkIn: new Date('2025-06-15T05:00:00Z'), checkOut: new Date('2025-06-15T09:00:00Z'), breakMinutes: 60, workedMinutes: 180 },
          { id: 'a2', checkIn: new Date('2025-06-15T09:00:00Z'), checkOut: new Date('2025-06-15T15:00:00Z'), breakMinutes: 0, workedMinutes: 360 },
        ]);
      mockPrisma.attendance.update.mockImplementation(({ where, data }) =>
        Promise.resolve({ id: where.id, userId: 'u1', ...data }),
      );
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      const result = (await service.update('c1', 'a2', {
        checkIn: '2025-06-15T09:00:00Z',
        checkOut: '2025-06-15T15:00:00Z',
      } as any)) as any;

      const calls = mockPrisma.attendance.update.mock.calls.map((c) => c[0]);
      // Самата редакция пише брутото
      expect(calls[0].where).toEqual({ id: 'a2' });
      expect(calls[0].data.workedMinutes).toBe(360);
      expect(calls[0].data.breakMinutes).toBeUndefined();
      // Преизчисление: a1 губи почивката, a2 я взима
      expect(calls).toContainEqual({ where: { id: 'a1' }, data: { breakMinutes: 0, workedMinutes: 240 } });
      expect(calls).toContainEqual({ where: { id: 'a2' }, data: { breakMinutes: 60, workedMinutes: 300 } });
      expect(result.workedMinutes).toBe(300);
    });

    it('does not touch rows whose break and worked minutes are already right', async () => {
      mockPrisma.attendance.findFirst.mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        date: new Date('2025-06-15T00:00:00Z'),
        checkIn: new Date('2025-06-15T05:00:00Z'),
        checkOut: new Date('2025-06-15T14:00:00Z'),
        breakMinutes: 60,
        workedMinutes: 480,
      });
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', checkIn: new Date('2025-06-15T05:00:00Z'), checkOut: new Date('2025-06-15T14:00:00Z'), breakMinutes: 60, workedMinutes: 480 },
      ]);
      mockPrisma.attendance.update.mockResolvedValue({ id: 'a1', userId: 'u1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await service.update('c1', 'a1', { notes: 'x' } as any);

      expect(mockPrisma.attendance.update).toHaveBeenCalledTimes(1);
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
    it('refuses a check-in for a future date', async () => {
      const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      await expect(service.checkIn('c1', 'u1', undefined, dayAfter)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.attendance.create).not.toHaveBeenCalled();
    });

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
      // Брутото; почивката идва от преизчислението на деня
      expect(updateCall.data.workedMinutes).toBeGreaterThanOrEqual(0);
      expect(updateCall.data.breakMinutes).toBeUndefined();
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

  describe('getMonthOverview', () => {
    it('rejects a malformed month', async () => {
      await expect(service.getMonthOverview('c1', '2025-13')).rejects.toThrow(BadRequestException);
      await expect(service.getMonthOverview('c1', 'junk')).rejects.toThrow(BadRequestException);
    });

    it('builds employee × day cells with worked minutes, leaves and totals', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([
        // u1: лична ставка бие тази на позицията; u2: наследява от позицията
        { hourlyRate: 15, position: { name: 'Монтажник', hourlyRate: 12 }, user: { id: 'u1', firstName: 'Иван', lastName: 'Иванов', isActive: true } },
        { hourlyRate: null, position: { name: 'Монтажник', hourlyRate: 12 }, user: { id: 'u2', firstName: 'Мария', lastName: 'Петрова', isActive: true } },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        // u1: два записа в един ден (два обекта) + отворен интервал на 3-ти
        { id: 'a1', userId: 'u1', date: new Date('2025-06-02T00:00:00Z'), checkIn: new Date('2025-06-02T06:00:00Z'), checkOut: new Date('2025-06-02T10:00:00Z'), workedMinutes: 240, siteId: 's1', site: { name: 'Варна' } },
        { id: 'a2', userId: 'u1', date: new Date('2025-06-02T00:00:00Z'), checkIn: new Date('2025-06-02T11:00:00Z'), checkOut: new Date('2025-06-02T15:00:00Z'), workedMinutes: 240, siteId: 's2', site: { name: 'София' } },
        { id: 'a3', userId: 'u1', date: new Date('2025-06-03T00:00:00Z'), checkIn: new Date('2025-06-03T06:00:00Z'), checkOut: null, workedMinutes: null, siteId: null, site: null },
      ]);
      mockPrisma.leave.findMany.mockResolvedValue([
        { userId: 'u2', type: 'ANNUAL', startDate: new Date('2025-06-02T00:00:00Z'), endDate: new Date('2025-06-04T00:00:00Z'), halfDay: false },
      ]);
      mockPrisma.payroll.findMany.mockResolvedValue([
        { id: 'p1', userId: 'u1', status: 'PAID', netSalary: 900, paidAt: new Date('2025-07-05T00:00:00Z') },
      ]);

      const r = await service.getMonthOverview('c1', '2025-06');
      expect(r.today).toBe(new Date().toISOString().slice(0, 10));
      expect(r.days).toHaveLength(30);
      expect(r.days[0]).toEqual({ date: '2025-06-01', isWorkingDay: false }); // неделя
      expect(r.workingDays).toBe(21);
      expect(r.workDayHours).toBe(8);

      const u1 = r.employees.find((e) => e.id === 'u1')!;
      expect(u1.cells['2025-06-02'].minutes).toBe(480);
      expect(u1.cells['2025-06-02'].records.map((x) => x.siteName)).toEqual(['Варна', 'София']);
      expect(u1.cells['2025-06-03'].open).toBe(true);
      expect(u1.totals).toEqual({ presentDays: 2, minutes: 480, leaveDays: 0, missingDays: 19 });
      expect(u1.position).toBe('Монтажник');
      expect(u1.hourlyRate).toBe(15);
      expect(u1.payroll).toEqual({ id: 'p1', status: 'PAID', netSalary: 900, paidAt: new Date('2025-07-05T00:00:00Z') });
      expect(mockPrisma.payroll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ year: 2025, month: 6 }) }),
      );

      const u2 = r.employees.find((e) => e.id === 'u2')!;
      expect(u2.hourlyRate).toBe(12);
      expect(u2.payroll).toBeNull();
      expect(u2.cells['2025-06-03'].leave).toBe('ANNUAL');
      expect(u2.totals).toEqual({ presentDays: 0, minutes: 0, leaveDays: 3, missingDays: 18 });
    });

    it('counts missing days only up to the client-local today', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'u1', firstName: 'A', lastName: 'A', isActive: true } },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);
      mockPrisma.leave.findMany.mockResolvedValue([]);
      // Юни 2025: 2-ри (пон.) .. 6-ти (пет.) = 5 работни дни до „днес"
      const r = await service.getMonthOverview('c1', '2025-06', undefined, undefined, '2025-06-06');
      expect(r.today).toBe('2025-06-06');
      expect(r.employees[0].totals.missingDays).toBe(5);
    });

    it('with a site filter lists only employees present at that site', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([
        { user: { id: 'u1', firstName: 'A', lastName: 'B', isActive: true } },
        { user: { id: 'u2', firstName: 'C', lastName: 'D', isActive: true } },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', userId: 'u1', date: new Date('2025-06-02T00:00:00Z'), checkIn: null, checkOut: null, workedMinutes: 480, siteId: 's1', site: { name: 'Варна' } },
      ]);
      mockPrisma.leave.findMany.mockResolvedValue([]);
      const r = await service.getMonthOverview('c1', '2025-06', undefined, 's1');
      expect(mockPrisma.attendance.findMany.mock.calls[0][0].where.siteId).toBe('s1');
      expect(r.employees.map((e) => e.id)).toEqual(['u1']);
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
