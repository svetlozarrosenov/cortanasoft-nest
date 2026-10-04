import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';

describe('ImpersonationService', () => {
  const prisma: any = {
    userCompany: { findUnique: jest.fn() },
    impersonationLog: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };
  const jwt: any = {
    sign: jest.fn().mockReturnValue('tok'),
    verify: jest.fn(),
  };
  const service = new ImpersonationService(prisma, jwt);
  const member = (over: any = {}) => ({
    userId: 'u1',
    companyId: 'c1',
    roleId: 'r1',
    user: {
      id: 'u1',
      email: 'u@x.bg',
      firstName: 'И',
      lastName: 'П',
      isActive: true,
    },
    company: { role: 'CLIENT', isActive: true, name: 'Фирма' },
    ...over,
  });
  beforeEach(() => jest.clearAllMocks());

  it('издава 1-часов токен с impersonatedBy и логва', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(member());
    const res = await service.start('admin', 'u1', 'c1', '1.2.3.4');
    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: 'u1',
        email: 'u@x.bg',
        companyId: 'c1',
        roleId: 'r1',
        impersonatedBy: 'admin',
      },
      { expiresIn: '1h' },
    );
    expect(prisma.impersonationLog.create).toHaveBeenCalledWith({
      data: { adminId: 'admin', userId: 'u1', companyId: 'c1', ip: '1.2.3.4' },
    });
    expect(res.accessToken).toBe('tok');
  });

  it('отказва себе си, фирмата-собственик, неактивен потребител и чужда фирма', async () => {
    await expect(service.start('u1', 'u1', 'c1')).rejects.toThrow(
      BadRequestException,
    );
    prisma.userCompany.findUnique.mockResolvedValueOnce(
      member({ company: { role: 'OWNER', isActive: true } }),
    );
    await expect(service.start('admin', 'u1', 'c1')).rejects.toThrow(
      ForbiddenException,
    );
    prisma.userCompany.findUnique.mockResolvedValueOnce(
      member({ user: { ...member().user, isActive: false } }),
    );
    await expect(service.start('admin', 'u1', 'c1')).rejects.toThrow(
      NotFoundException,
    );
    prisma.userCompany.findUnique.mockResolvedValueOnce(null);
    await expect(service.start('admin', 'u1', 'c-other')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.impersonationLog.create).not.toHaveBeenCalled();
  });

  it('stop издава нов токен на админа по impersonatedBy и затваря лога', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'admin',
      email: 'a@x.bg',
      isActive: true,
      loginEnabled: true,
      userCompanies: [
        { companyId: 'owner', roleId: 'r-admin', company: { id: 'owner' } },
      ],
    });
    const res = await service.stop({ id: 'u1', impersonatedBy: 'admin' });
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'admin', email: 'a@x.bg', companyId: 'owner', roleId: 'r-admin' },
      { expiresIn: '1d' },
    );
    expect(res).toEqual({ adminToken: 'tok', companyId: 'owner' });
    expect(prisma.impersonationLog.updateMany).toHaveBeenCalledWith({
      where: { adminId: 'admin', userId: 'u1', endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
  });

  it('stop отказва без сесия и ако админът вече не е активен/в OWNER фирма', async () => {
    await expect(
      service.stop({ id: 'u1', impersonatedBy: null }),
    ).rejects.toThrow(BadRequestException);
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValue({
        id: 'admin',
        isActive: true,
        loginEnabled: true,
        userCompanies: [],
      });
    await expect(
      service.stop({ id: 'u1', impersonatedBy: 'admin' }),
    ).rejects.toThrow(ForbiddenException);
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    await expect(
      service.stop({ id: 'u1', impersonatedBy: 'admin' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
