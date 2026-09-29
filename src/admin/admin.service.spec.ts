import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

type WriteArgs = { data: Record<string, unknown> };
const dataOf = (mock: jest.Mock): Record<string, unknown> =>
  (mock.mock.calls as unknown as WriteArgs[][])[0][0].data;

describe('AdminService companies', () => {
  let service: AdminService;
  let prisma: {
    company: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'c1', ...data }),
          ),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'c2', ...data }),
          ),
      },
    };
    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('persists the push notifications and review status toggles on update', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1',
      role: 'OWNER',
      eik: '1',
      vatNumber: null,
    });

    await service.updateCompany('c1', {
      pushNotificationsEnabled: true,
      enableReviewStatus: false,
    });

    const data = dataOf(prisma.company.update);
    expect(data.pushNotificationsEnabled).toBe(true);
    expect(data.enableReviewStatus).toBe(false);
  });

  it('leaves the toggles untouched when the update does not mention them', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1',
      role: 'CLIENT',
      eik: '1',
      vatNumber: null,
    });

    await service.updateCompany('c1', { name: 'Renamed' });

    const data = dataOf(prisma.company.update);
    expect(data.pushNotificationsEnabled).toBeUndefined();
    expect(data.enableReviewStatus).toBeUndefined();
  });

  it('persists the toggles on create', async () => {
    await service.createCompany({
      name: 'New',
      eik: '123',
      pushNotificationsEnabled: true,
    } as never);

    const data = dataOf(prisma.company.create);
    expect(data.pushNotificationsEnabled).toBe(true);
  });

  it('still refuses to deactivate the OWNER company', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 'c1',
      role: 'OWNER',
      eik: '1',
      vatNumber: null,
    });

    await expect(
      service.updateCompany('c1', { isActive: false }),
    ).rejects.toThrow(ForbiddenException);
  });
});
