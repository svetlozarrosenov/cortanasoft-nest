import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HrSettingsService } from './hr-settings.service';
import { PrismaService } from '../prisma/prisma.service';

const base = {
  id: 's1',
  companyId: 'c1',
  workDayStart: '08:00',
  workDayEnd: '17:00',
  breakMinutes: 60,
};

const mockPrisma = {
  hrSettings: { upsert: jest.fn(), update: jest.fn() },
};

describe('HrSettingsService', () => {
  let service: HrSettingsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [HrSettingsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(HrSettingsService);
  });

  it('get: lazily upserts defaults and derives work-day hours', async () => {
    mockPrisma.hrSettings.upsert.mockResolvedValue(base);
    const res = await service.get('c1');
    expect(mockPrisma.hrSettings.upsert).toHaveBeenCalledWith({
      where: { companyId: 'c1' },
      create: { companyId: 'c1' },
      update: {},
    });
    expect(res.workDayMinutes).toBe(480);
    expect(res.workDayHours).toBe(8);
  });

  it('update: merges partial dto and recalculates hours', async () => {
    mockPrisma.hrSettings.upsert.mockResolvedValue(base);
    mockPrisma.hrSettings.update.mockImplementation(({ data }) => ({ ...base, ...data }));
    const res = await service.update('c1', { workDayEnd: '16:30', breakMinutes: 30 });
    expect(mockPrisma.hrSettings.update).toHaveBeenCalledWith({
      where: { companyId: 'c1' },
      data: { workDayStart: '08:00', workDayEnd: '16:30', breakMinutes: 30 },
    });
    expect(res.workDayHours).toBe(8);
  });

  it('update: rejects end before start', async () => {
    mockPrisma.hrSettings.upsert.mockResolvedValue(base);
    await expect(service.update('c1', { workDayEnd: '07:00' })).rejects.toThrow(BadRequestException);
    expect(mockPrisma.hrSettings.update).not.toHaveBeenCalled();
  });

  it('update: rejects break covering the whole day', async () => {
    mockPrisma.hrSettings.upsert.mockResolvedValue(base);
    await expect(service.update('c1', { breakMinutes: 540 })).rejects.toThrow(BadRequestException);
  });
});
