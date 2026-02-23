import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  userCompany: {
    findUnique: jest.fn(),
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
    userCompanies: [
      {
        companyId: 'c1',
        roleId: 'r1',
        isDefault: true,
        company: { id: 'c1', name: 'ACME', eik: '123', isActive: true, role: 'CLIENT', currency: { code: 'BGN' } },
        role: { id: 'r1', name: 'Admin', permissions: {} },
      },
    ],
    ...overrides,
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');
      expect(result.id).toBe('u1');
      expect(result.defaultUserCompany.companyId).toBe('c1');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('bad@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));
      await expect(service.validateUser('test@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no companies', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ userCompanies: [] }));
      await expect(service.validateUser('test@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser('test@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should find default company (isDefault=true and active)', async () => {
      const user = makeUser({
        userCompanies: [
          { companyId: 'c1', isDefault: false, company: { id: 'c1', isActive: true, role: 'CLIENT' }, role: { id: 'r1' }, roleId: 'r1' },
          { companyId: 'c2', isDefault: true, company: { id: 'c2', isActive: true, role: 'CLIENT' }, role: { id: 'r2' }, roleId: 'r2' },
        ],
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'pass');
      expect(result.defaultUserCompany.companyId).toBe('c2');
    });

    it('should fall back to first active company when no default', async () => {
      const user = makeUser({
        userCompanies: [
          { companyId: 'c1', isDefault: false, company: { id: 'c1', isActive: false, role: 'CLIENT' }, role: { id: 'r1' }, roleId: 'r1' },
          { companyId: 'c2', isDefault: false, company: { id: 'c2', isActive: true, role: 'CLIENT' }, role: { id: 'r2' }, roleId: 'r2' },
        ],
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'pass');
      expect(result.defaultUserCompany.companyId).toBe('c2');
    });

    it('should throw UnauthorizedException when no active companies', async () => {
      const user = makeUser({
        userCompanies: [
          { companyId: 'c1', isDefault: true, company: { id: 'c1', isActive: false }, role: { id: 'r1' }, roleId: 'r1' },
        ],
      });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.validateUser('test@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
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
      await service.login({ email: 'test@test.com', password: 'pass', rememberMe: true } as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: '30d' },
      );
    });

    it('should set expiresIn to 1d when rememberMe is false', async () => {
      await service.login({ email: 'test@test.com', password: 'pass', rememberMe: false } as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: '1d' },
      );
    });

    it('should return user data with companies list', async () => {
      const result = await service.login({ email: 'test@test.com', password: 'pass' } as any);

      expect(result.user.id).toBe('u1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.companies).toHaveLength(1);
      expect(result.user.companies[0].id).toBe('c1');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.rememberMe).toBe(false);
    });
  });

  describe('switchCompany', () => {
    it('should switch company successfully', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({
        userId: 'u1',
        companyId: 'c2',
        roleId: 'r2',
        company: { id: 'c2', isActive: true, role: 'CLIENT', currency: { code: 'EUR' } },
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
      await expect(service.switchCompany('u1', 'bad')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when company is inactive', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue({
        company: { isActive: false },
        user: { id: 'u1', email: 'test@test.com' },
        role: {},
      });
      await expect(service.switchCompany('u1', 'c2')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCookieOptions', () => {
    it('should return production options with secure=true and sameSite=strict', () => {
      mockConfigService.get.mockReturnValue('production');
      const opts = service.getCookieOptions(false);

      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('strict');
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
