import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userCompanies: {
          include: {
            company: {
              include: {
                currency: true,
              },
            },
            role: true,
          },
          orderBy: {
            isDefault: 'desc',
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.userCompanies.length === 0) {
      throw new UnauthorizedException('User has no company assigned');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Намираме компанията по подразбиране или първата активна
    const defaultUserCompany =
      user.userCompanies.find((uc) => uc.isDefault && uc.company.isActive) ||
      user.userCompanies.find((uc) => uc.company.isActive);

    if (!defaultUserCompany) {
      throw new UnauthorizedException('No active company found');
    }

    const { password: _, ...result } = user;
    return {
      ...result,
      defaultUserCompany,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.defaultUserCompany.companyId,
      roleId: user.defaultUserCompany.roleId,
    };

    // Set token expiration based on rememberMe (30 days vs 1 day)
    const expiresIn = loginDto.rememberMe ? '30d' : '1d';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    // Форматираме потребителя за frontend
    const currentCompany = user.defaultUserCompany.company;
    const currentRole = user.defaultUserCompany.role;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isSuperAdmin: currentCompany.role === 'OWNER',
        currentCompany,
        currentRole,
        companies: user.userCompanies.map((uc) => ({
          id: uc.company.id,
          name: uc.company.name,
          eik: uc.company.eik,
          role: uc.role,
          isDefault: uc.isDefault,
        })),
      },
      accessToken,
      rememberMe: loginDto.rememberMe || false,
    };
  }

  async switchCompany(userId: string, companyId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      include: {
        company: {
          include: {
            currency: true,
          },
        },
        user: true,
        role: true,
      },
    });

    if (!userCompany) {
      throw new UnauthorizedException('User does not belong to this company');
    }

    if (!userCompany.company.isActive) {
      throw new UnauthorizedException('Company is inactive');
    }

    const payload: JwtPayload = {
      sub: userCompany.user.id,
      email: userCompany.user.email,
      companyId: userCompany.companyId,
      roleId: userCompany.roleId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      currentCompany: userCompany.company,
      currentRole: userCompany.role,
      isSuperAdmin: userCompany.company.role === 'OWNER',
    };
  }

  getCookieOptions(rememberMe: boolean = false) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    // 30 days if rememberMe, otherwise 1 day
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    if (isProduction) {
      return {
        httpOnly: true,
        secure: true,
        sameSite: 'strict' as const,
        maxAge,
        path: '/',
      };
    }

    // Development: allow cross-origin cookies for local network testing
    // sameSite: 'none' requires secure: true, but we're on HTTP
    // The issue is that ports make origins different (3000 vs 3001)
    // Setting domain explicitly helps with same-host different-port scenarios
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge,
      path: '/',
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}
