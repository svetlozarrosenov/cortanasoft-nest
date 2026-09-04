import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = { $queryRaw: jest.fn() };
  const res = { status: jest.fn() } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('returns 200 + ok when the DB answers', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    process.env.APP_VERSION = 'abc123';

    const report = await controller.check(res);

    expect(report.status).toBe('ok');
    expect(report.db).toBe('ok');
    expect(report.dbLatencyMs).toEqual(expect.any(Number));
    expect(report.version).toBe('abc123');
    expect(report.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 503 + error when the DB query throws', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const report = await controller.check(res);

    expect(report.status).toBe('error');
    expect(report.db).toBe('down');
    expect(report.dbLatencyMs).toBeNull();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 503 when the DB query hangs past the timeout', async () => {
    jest.useFakeTimers();
    prisma.$queryRaw.mockReturnValue(new Promise(() => {})); // never resolves

    const pending = controller.check(res);
    await jest.advanceTimersByTimeAsync(3001);
    const report = await pending;

    expect(report.db).toBe('down');
    expect(res.status).toHaveBeenCalledWith(503);
    jest.useRealTimers();
  });
});
