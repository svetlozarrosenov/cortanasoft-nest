import { BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service';

describe('EmployeesService.leave', () => {
  const companyId = 'company-1';

  function build() {
    const tx = {
      user: { update: jest.fn() },
      trustedDevice: { deleteMany: jest.fn() },
      userCompany: {
        update: jest.fn().mockResolvedValue({
          user: { id: 'user-2', loginEnabled: true, isActive: false },
          leftAt: new Date('2026-11-24'),
        }),
      },
    };
    const prisma = {
      userCompany: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'uc-1',
          user: { _count: { userCompanies: 1 } },
        }),
      },
      company: { findUnique: jest.fn().mockResolvedValue({ defaultAnnualLeaveDays: 20 }) },
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const service = new EmployeesService(prisma as never);
    return { service, prisma, tx };
  }

  it('refuses to mark the acting user as left', async () => {
    const { service, prisma } = build();

    await expect(service.leave(companyId, 'user-1', {}, 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.userCompany.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks another employee as left', async () => {
    const { service, tx } = build();

    await service.leave(companyId, 'user-2', {}, 'user-1');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { isActive: false },
    });
  });
});
