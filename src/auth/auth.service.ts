import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { normalizePermissions } from '../common/config/permissions.config';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
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

    // Record terms acceptance if user accepted terms during login
    if (loginDto.acceptTerms && !user.termsAcceptedAt) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { termsAcceptedAt: new Date() },
      });
      user.termsAcceptedAt = new Date();
    }

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
    const currentRole = {
      ...user.defaultUserCompany.role,
      permissions: normalizePermissions(user.defaultUserCompany.role.permissions as any),
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isSuperAdmin: currentCompany.role === 'OWNER',
        termsAcceptedAt: user.termsAcceptedAt,
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
      currentRole: {
        ...userCompany.role,
        permissions: normalizePermissions(userCompany.role.permissions as any),
      },
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

  createWsToken(userId: string): string {
    return this.jwtService.sign({ sub: userId }, { expiresIn: '60s' });
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

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return { success: true };
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: {
        token,
        expiresAt,
        userId: user.id,
      },
    });

    // Send email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailService.send({
        to: user.email,
        subject: 'Възстановяване на парола — CortanaSoft',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0;">CortanaSoft</h1>
            </div>
            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px;">
              <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">Забравена парола</h2>
              <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Здравейте, ${user.firstName}. Получихме заявка за промяна на паролата ви.
                Натиснете бутона по-долу, за да зададете нова парола.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}"
                   style="display: inline-block; background: linear-gradient(to right, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                  Задай нова парола
                </a>
              </div>
              <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin: 24px 0 0;">
                Линкът е валиден 1 час. Ако не сте заявили промяна на паролата, игнорирайте този имейл.
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException('Невалиден или изтекъл линк за промяна на парола');
    }

    if (resetRecord.usedAt) {
      throw new BadRequestException('Този линк вече е бил използван');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Линкът е изтекъл. Моля, заявете нов.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }
}
