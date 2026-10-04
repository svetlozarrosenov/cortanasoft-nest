import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkShiftsService } from './work-shifts.service';
import { AutoAttendanceCronService } from './auto-attendance.cron';

describe('WorkShiftsService', () => {
  const prisma: any = {
    site: { findFirst: jest.fn(), findMany: jest.fn() },
    userCompany: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    attendance: { deleteMany: jest.fn() },
    workShift: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const attendance: any = { create: jest.fn() };
  const service = new WorkShiftsService(prisma, attendance);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.site.findFirst.mockResolvedValue({ id: 'site1' });
    prisma.userCompany.findMany.mockImplementation(async ({ where }: any) =>
      where.userId.in.map((userId: string) => ({ userId })),
    );
    prisma.workShift.findMany.mockResolvedValue([]);
    prisma.workShift.createMany.mockResolvedValue({ count: 0 });
  });

  it('серия: всеки пон/ср до крайната дата, за всеки служител, с общ seriesId', async () => {
    // 2026-10-05 е понеделник
    const res = await service.create('c1', {
      siteId: 'site1',
      userIds: ['u1', 'u2'],
      date: '2026-10-05',
      startTime: '18:00',
      endTime: '21:00',
      repeatUntil: '2026-10-18',
      weekdays: [1, 3],
    });
    const rows = prisma.workShift.createMany.mock.calls[0][0].data;
    // 2 седмици × (пон, ср) × 2 души = 8
    expect(rows).toHaveLength(8);
    expect(res.created).toBe(8);
    expect(new Set(rows.map((r: any) => r.seriesId)).size).toBe(1);
    expect(
      rows.every((r: any) => r.companyId === 'c1' && r.siteId === 'site1'),
    ).toBe(true);
    expect([
      ...new Set(rows.map((r: any) => r.date.toISOString().slice(0, 10))),
    ]).toEqual(['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14']);
  });

  it('ротация 2/2: два дни работа, два почивка, от началната дата', async () => {
    const res = await service.create('c1', {
      siteId: 'site1',
      userIds: ['u1'],
      date: '2026-10-05',
      startTime: '08:00',
      endTime: '20:00',
      repeatUntil: '2026-10-14',
      rotationWork: 2,
      rotationRest: 2,
      weekdays: [1], // игнорира се при ротация
    });
    const rows = prisma.workShift.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.date.toISOString().slice(0, 10))).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-09',
      '2026-10-10',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(res.created).toBe(6);
    expect(rows[0].seriesId).toBeTruthy();
  });

  it('прескача вече съществуващи смени (същият човек, обект, дата, начален час)', async () => {
    prisma.workShift.findMany.mockResolvedValue([
      { userId: 'u1', date: new Date('2026-10-05T00:00:00.000Z') },
    ]);
    const res = await service.create('c1', {
      siteId: 'site1',
      userIds: ['u1'],
      date: '2026-10-05',
      startTime: '08:00',
      endTime: '12:00',
    });
    expect(res).toMatchObject({ created: 0, skipped: 1 });
    expect(prisma.workShift.createMany).not.toHaveBeenCalled();
  });

  it('отказва чужд обект и служител извън фирмата', async () => {
    prisma.site.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.create('c1', {
        siteId: 'x',
        userIds: ['u1'],
        date: '2026-10-05',
        startTime: '08:00',
        endTime: '12:00',
      }),
    ).rejects.toThrow(NotFoundException);
    prisma.userCompany.findMany.mockResolvedValueOnce([]);
    await expect(
      service.create('c1', {
        siteId: 'site1',
        userIds: ['u9'],
        date: '2026-10-05',
        startTime: '08:00',
        endTime: '12:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('нощна смяна: присъствието свършва на следващия ден', async () => {
    prisma.workShift.findMany.mockResolvedValueOnce([
      {
        id: 's1',
        userId: 'u1',
        siteId: 'site1',
        date: new Date('2026-10-05T00:00:00.000Z'),
        startTime: '22:00',
        endTime: '06:00',
      },
    ]);
    prisma.leave = { findMany: jest.fn().mockResolvedValue([]) };
    prisma.workShift.update = jest.fn();
    attendance.create.mockResolvedValue({ id: 'att9' });
    await service.autoReportDay('c1', '2026-10-05');
    expect(attendance.create.mock.calls[0][2]).toMatchObject({
      checkIn: '2026-10-05T19:00:00.000Z',
      checkOut: '2026-10-06T03:00:00.000Z',
    });
  });

  it('еднакви начален и краен час е грешка', async () => {
    await expect(
      service.create('c1', {
        siteId: 'site1',
        userIds: ['u1'],
        date: '2026-10-05',
        startTime: '12:00',
        endTime: '12:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('копиране на седмица мести датите с 7 дни и прескача дубликати', async () => {
    prisma.workShift.findMany
      .mockResolvedValueOnce([
        {
          companyId: 'c1',
          siteId: 'site1',
          userId: 'u1',
          date: new Date('2026-10-05T00:00:00.000Z'),
          startTime: '08:00',
          endTime: '12:00',
          note: null,
          seriesId: null,
        },
        {
          companyId: 'c1',
          siteId: 'site1',
          userId: 'u2',
          date: new Date('2026-10-07T00:00:00.000Z'),
          startTime: '08:00',
          endTime: '12:00',
          note: null,
          seriesId: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: 'u2',
          siteId: 'site1',
          date: new Date('2026-10-14T00:00:00.000Z'),
          startTime: '08:00',
        },
      ]);
    const res = await service.copyWeek('c1', {
      fromWeek: '2026-10-05',
      toWeek: '2026-10-12',
    });
    expect(res).toEqual({ created: 1, skipped: 1 });
    expect(
      prisma.workShift.createMany.mock.calls[0][0].data[0].date.toISOString(),
    ).toBe('2026-10-12T00:00:00.000Z');
  });

  it('копирането изисква понеделници', async () => {
    await expect(
      service.copyWeek('c1', { fromWeek: '2026-10-06', toWeek: '2026-10-13' }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('WorkShiftsService.autoReportDay (присъствия от графика)', () => {
  const prisma: any = {
    workShift: { findMany: jest.fn(), update: jest.fn() },
    leave: { findMany: jest.fn() },
  };
  const attendance: any = { create: jest.fn() };
  const service = new WorkShiftsService(prisma, attendance);
  const day = new Date('2026-10-05T00:00:00.000Z');

  beforeEach(() => jest.clearAllMocks());

  it('отчита планираните смени за деня и създава присъствия; отпускът има приоритет', async () => {
    prisma.workShift.findMany.mockResolvedValue([
      {
        id: 's1',
        userId: 'u1',
        siteId: 'site1',
        date: day,
        startTime: '08:00',
        endTime: '12:00',
      },
      {
        id: 's2',
        userId: 'u2',
        siteId: 'site1',
        date: day,
        startTime: '08:00',
        endTime: '12:00',
      },
    ]);
    // u2 е в одобрен отпуск
    prisma.leave.findMany.mockResolvedValue([
      {
        userId: 'u2',
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-10-07T00:00:00.000Z'),
      },
    ]);
    attendance.create.mockResolvedValue({ id: 'att1' });

    const res = await service.autoReportDay('c1', '2026-10-05');
    expect(res).toEqual({ done: 1, onLeave: 1, failed: 0 });
    expect(attendance.create).toHaveBeenCalledTimes(1);
    expect(attendance.create.mock.calls[0][2]).toMatchObject({
      userId: 'u1',
      siteId: 'site1',
      date: '2026-10-05',
    });
    expect(prisma.workShift.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: expect.objectContaining({
        status: 'DONE',
        attendanceId: 'att1',
        reportedById: null,
      }),
    });
    // само PLANNED без присъствие се взимат
    expect(prisma.workShift.findMany.mock.calls[0][0].where).toMatchObject({
      companyId: 'c1',
      status: 'PLANNED',
      attendanceId: null,
    });
  });

  it('грешка от Attendance (ръчно въведено, застъпване) прескача смяната, не спира останалите', async () => {
    prisma.workShift.findMany.mockResolvedValue([
      {
        id: 's1',
        userId: 'u1',
        siteId: 'site1',
        date: day,
        startTime: '08:00',
        endTime: '12:00',
      },
      {
        id: 's2',
        userId: 'u3',
        siteId: 'site1',
        date: day,
        startTime: '08:00',
        endTime: '12:00',
      },
    ]);
    prisma.leave.findMany.mockResolvedValue([]);
    attendance.create
      .mockRejectedValueOnce(new Error('overlap'))
      .mockResolvedValueOnce({ id: 'att2' });
    const res = await service.autoReportDay('c1', '2026-10-05');
    expect(res).toEqual({ done: 1, onLeave: 0, failed: 1 });
    expect(prisma.workShift.update).toHaveBeenCalledTimes(1);
  });
});

describe('AutoAttendanceCronService', () => {
  it('минава само през фирмите с включена настройка', async () => {
    const prisma: any = {
      hrSettings: {
        findMany: jest.fn().mockResolvedValue([{ companyId: 'c1' }]),
      },
    };
    const shifts: any = {
      autoReportDay: jest
        .fn()
        .mockResolvedValue({ done: 2, onLeave: 0, failed: 0 }),
    };
    const cron = new AutoAttendanceCronService(prisma, shifts);
    const res = await cron.runForDate('2026-10-05');
    expect(prisma.hrSettings.findMany).toHaveBeenCalledWith({
      where: { autoAttendanceFromSchedule: true },
      select: { companyId: true },
    });
    expect(shifts.autoReportDay).toHaveBeenCalledWith('c1', '2026-10-05');
    expect(res).toEqual({ companies: 1, done: 2, onLeave: 0, failed: 0 });
  });
});
