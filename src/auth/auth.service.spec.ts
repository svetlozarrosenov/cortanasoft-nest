import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { encryptSecret } from '../common/utils/secret-crypto.util';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Ключ за шифроването на TOTP тайните в тестовете
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
  },
  trustedDevice: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  twoFactorChallenge: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: { send: jest.fn() } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  const makeUser = (overrides = {}) => ({
    id: 'u1',
    email: 'test@test.com',
    password: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    loginEnabled: true,
    twoFactorMode: 'NOT_REQUIRED',
    twoFactorSecret: null,
    userCompanies: [
      {
        companyId: 'c1',
        roleId: 'r1',
        isDefault: true,
        company: {
          id: 'c1',
          name: 'ACME',
          eik: '123',
          isActive: true,
          role: 'CLIENT',
          currency: { code: 'BGN' },
        },
        role: { id: 'r1', name: 'Admin', permissions: {} },
      },
    ],
    ...overrides,
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result.id).toBe('u1');
      expect(result.defaultUserCompany.companyId).toBe('c1');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.validateUser('bad@test.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('служител без достъп (loginEnabled=false) не влиза дори с вярна парола', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser({ loginEnabled: false }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.validateUser('test@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ isActive: false }),
      );
      await expect(
        service.validateUser('test@test.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no companies', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ userCompanies: [] }),
      );
      await expect(
        service.validateUser('test@test.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.validateUser('test@test.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should find default company (isDefault=true and active)', async () => {
      const user = makeUser({
        userCompanies: [
          {
            companyId: 'c1',
            isDefault: false,
            company: { id: 'c1', isActive: true, role: 'CLIENT' },
            role: { id: 'r1' },
            roleId: 'r1',
          },
          {
            companyId: 'c2',
            isDefault: true,
            company: { id: 'c2', isActive: true, role: 'CLIENT' },
            role: { id: 'r2' },
            roleId: 'r2',
          },
        ],
      });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'pass');
      expect(result.defaultUserCompany.companyId).toBe('c2');
    });

    it('should fall back to first active company when no default', async () => {
      const user = makeUser({
        userCompanies: [
          {
            companyId: 'c1',
            isDefault: false,
            company: { id: 'c1', isActive: false, role: 'CLIENT' },
            role: { id: 'r1' },
            roleId: 'r1',
          },
          {
            companyId: 'c2',
            isDefault: false,
            company: { id: 'c2', isActive: true, role: 'CLIENT' },
            role: { id: 'r2' },
            roleId: 'r2',
          },
        ],
      });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'pass');
      expect(result.defaultUserCompany.companyId).toBe('c2');
    });

    it('should throw UnauthorizedException when no active companies', async () => {
      const user = makeUser({
        userCompanies: [
          {
            companyId: 'c1',
            isDefault: true,
            company: { id: 'c1', isActive: false },
            role: { id: 'r1' },
            roleId: 'r1',
          },
        ],
      });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.validateUser('test@test.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should return JWT with correct payload', async () => {
      await service.login({ email: 'test@test.com', password: 'pass' } as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'u1', email: 'test@test.com', companyId: 'c1', roleId: 'r1' },
        { expiresIn: '1d' },
      );
    });

    it('should set expiresIn to 30d when rememberMe is true', async () => {
      await service.login({
        email: 'test@test.com',
        password: 'pass',
        rememberMe: true,
      } as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
        expiresIn: '30d',
      });
    });

    it('should set expiresIn to 1d when rememberMe is false', async () => {
      await service.login({
        email: 'test@test.com',
        password: 'pass',
        rememberMe: false,
      } as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
        expiresIn: '1d',
      });
    });

    it('should return user data with companies list', async () => {
      const result = await service.login({
        email: 'test@test.com',
        password: 'pass',
      } as any);
      if (!('user' in result)) throw new Error('expected a completed login');

      expect(result.user.id).toBe('u1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.companies).toHaveLength(1);
      expect(result.user.companies[0].id).toBe('c1');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.rememberMe).toBe(false);
    });
  });

  describe('двуфакторна автентикация (TOTP)', () => {
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.twoFactorChallenge.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.twoFactorChallenge.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'ch1', ...data }),
      );
      mockPrisma.trustedDevice.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.trustedDevice.create.mockResolvedValue({ id: 'td1' });
      mockPrisma.twoFactorChallenge.delete.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
    });

    it('NOT_SETUP: входът връща QR за записване вместо токен', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ twoFactorMode: 'NOT_SETUP' }),
      );

      const result = await service.login({
        email: 'test@test.com',
        password: 'pass',
      } as any);

      expect('twoFactor' in result).toBe(true);
      if (!('twoFactor' in result)) return;
      expect(result.twoFactor.setup).toBe(true);
      expect(result.twoFactor.qrDataUrl).toMatch(/^data:image\/png/);
      expect(result.twoFactor.manualKey).toBeTruthy();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
      // ключът се пази шифрован в challenge-а, не на потребителя
      const created =
        mockPrisma.twoFactorChallenge.create.mock.calls[0][0].data;
      expect(created.purpose).toBe('SETUP');
      expect(created.pendingSecret).toMatch(/^enc:v1:/);
    });

    it('REQUIRED без запомнено устройство: иска код (без QR)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({
          twoFactorMode: 'REQUIRED',
          twoFactorSecret: encryptSecret('ABC'),
        }),
      );
      mockPrisma.trustedDevice.findUnique.mockResolvedValue(null);

      const result = await service.login(
        { email: 'test@test.com', password: 'pass' } as any,
        'unknown-token',
      );

      if (!('twoFactor' in result)) throw new Error('expected a challenge');
      expect(result.twoFactor.setup).toBe(false);
      expect(result.twoFactor.qrDataUrl).toBeUndefined();
    });

    it('REQUIRED със запомнено устройство: влиза направо', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ twoFactorMode: 'REQUIRED' }),
      );
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: 'td1',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.trustedDevice.update.mockResolvedValue({});

      const result = await service.login(
        { email: 'test@test.com', password: 'pass' } as any,
        'good-token',
      );

      expect('user' in result).toBe(true);
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('изтекло запомнено устройство или чуждо не се брои', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({ twoFactorMode: 'REQUIRED' }),
      );
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: 'td1',
        userId: 'someone-else',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.login(
        { email: 'test@test.com', password: 'pass' } as any,
        'token',
      );

      expect('twoFactor' in result).toBe(true);
    });

    it('verify при SETUP: верен код записва ключа, издава токен и запомня устройството', async () => {
      const secret = authenticator.generateSecret();
      mockPrisma.twoFactorChallenge.findUnique.mockResolvedValue({
        id: 'ch1',
        userId: 'u1',
        purpose: 'SETUP',
        pendingSecret: encryptSecret(secret),
        rememberMe: true,
        acceptTerms: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ twoFactorMode: 'NOT_SETUP' }),
      );

      const result = await service.verifyTwoFactor(
        { challengeId: 'ch1', code: authenticator.generate(secret) },
        'Mozilla/5.0',
      );

      expect(result.user.id).toBe('u1');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.rememberMe).toBe(true);
      expect(result.trustedDeviceToken).toHaveLength(64);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ twoFactorMode: 'REQUIRED' }),
        }),
      );
      expect(mockPrisma.trustedDevice.create).toHaveBeenCalled();
      expect(mockPrisma.twoFactorChallenge.delete).toHaveBeenCalledWith({
        where: { id: 'ch1' },
      });
    });

    it('verify при LOGIN: грешен код брои опит и отказва', async () => {
      const secret = authenticator.generateSecret();
      mockPrisma.twoFactorChallenge.findUnique.mockResolvedValue({
        id: 'ch1',
        userId: 'u1',
        purpose: 'LOGIN',
        pendingSecret: null,
        rememberMe: false,
        acceptTerms: false,
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({
          twoFactorMode: 'REQUIRED',
          twoFactorSecret: encryptSecret(secret),
        }),
      );
      mockPrisma.twoFactorChallenge.update.mockResolvedValue({});

      await expect(
        service.verifyTwoFactor(
          { challengeId: 'ch1', code: '000000' },
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.twoFactorChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('verify: изтекъл или изчерпан challenge се отказва', async () => {
      mockPrisma.twoFactorChallenge.findUnique.mockResolvedValue({
        id: 'ch1',
        userId: 'u1',
        purpose: 'LOGIN',
        attempts: 5,
        expiresAt: new Date(Date.now() + 60000),
      });
      await expect(
        service.verifyTwoFactor(
          { challengeId: 'ch1', code: '123456' },
          undefined,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('switchCompany', () => {
    it('should switch company successfully', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({
        userId: 'u1',
        companyId: 'c2',
        roleId: 'r2',
        company: {
          id: 'c2',
          isActive: true,
          role: 'CLIENT',
          currency: { code: 'EUR' },
        },
        user: { id: 'u1', email: 'test@test.com' },
        role: { id: 'r2', name: 'User' },
      });

      const result = await service.switchCompany('u1', 'c2');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.currentCompany.id).toBe('c2');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'test@test.com',
        companyId: 'c2',
        roleId: 'r2',
      });
    });

    it('should throw UnauthorizedException when user not assigned to company', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(null);
      await expect(service.switchCompany('u1', 'bad')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when company is inactive', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({
        company: { isActive: false },
        user: { id: 'u1', email: 'test@test.com' },
        role: {},
      });
      await expect(service.switchCompany('u1', 'c2')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getCookieOptions', () => {
    it('should return production options with secure=true and sameSite=none', () => {
      mockConfigService.get.mockReturnValue('production');
      const opts = service.getCookieOptions(false);

      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      // Cross-site cookie за .cortanasoft.com субдомейните (secure=true го изисква)
      expect(opts.sameSite).toBe('none');
      expect(opts.domain).toBe('.cortanasoft.com');
    });

    it('should return dev options with secure=false and sameSite=lax', () => {
      mockConfigService.get.mockReturnValue('development');
      const opts = service.getCookieOptions(false);

      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(false);
      expect(opts.sameSite).toBe('lax');
    });

    it('should set maxAge to 30 days when rememberMe=true', () => {
      mockConfigService.get.mockReturnValue('production');
      const opts = service.getCookieOptions(true);
      expect(opts.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it('should set maxAge to 1 day when rememberMe=false', () => {
      mockConfigService.get.mockReturnValue('production');
      const opts = service.getCookieOptions(false);
      expect(opts.maxAge).toBe(24 * 60 * 60 * 1000);
    });
  });
});
