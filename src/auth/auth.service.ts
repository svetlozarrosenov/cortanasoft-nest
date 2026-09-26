import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { normalizePermissions } from '../common/config/permissions.config';
import { LoginDto } from './dto/login.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import {
  encryptSecret,
  decryptSecretIfNeeded,
} from '../common/utils/secret-crypto.util';

// Двуфакторна автентикация (TOTP): кодът е валиден ±1 стъпка (30 s) заради
// разминаване на часовника на телефона.
authenticator.options = { window: 1 };
const TWO_FACTOR_ISSUER = 'CortanaSoft';
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_MAX_ATTEMPTS = 5;
export const TRUSTED_DEVICE_DAYS = 30;

/** Незавършен вход: клиентът показва QR (при първо записване) и поле за код */
export interface TwoFactorChallengeResult {
  twoFactor: {
    challengeId: string;
    setup: boolean;
    /** data: URL с QR кода (само при setup) */
    qrDataUrl?: string;
    /** Ключът за ръчно въвеждане в приложението (само при setup) */
    manualKey?: string;
  };
}

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

// A valid bcrypt hash used to burn the same CPU time when an email doesn't
// exist, so login response timing can't reveal whether an account is registered.
const DUMMY_PASSWORD_HASH =
  '$2b$10$wnjbajAkLYLtcKjDOuWJleLXWjLEd/ukaJDOV8LK28SUVt11nJguO';

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
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
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

    // Always run a bcrypt compare (against a dummy hash when the user is
    // missing) so response timing is the same whether or not the email exists.
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );

    // Намираме компанията по подразбиране или първата активна
    const defaultUserCompany =
      user?.userCompanies.find((uc) => uc.isDefault && uc.company.isActive) ||
      user?.userCompanies.find((uc) => uc.company.isActive);

    // Single generic error for every failure mode (unknown email, wrong
    // password, inactive user, no/inactive company) to prevent account
    // enumeration — never reveal which of these conditions failed.
    if (
      !user ||
      !user.isActive ||
      !user.loginEnabled ||
      !isPasswordValid ||
      user.userCompanies.length === 0 ||
      !defaultUserCompany
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return {
      ...result,
      defaultUserCompany,
    };
  }

  async login(loginDto: LoginDto, trustedDeviceToken?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Двуфакторна автентикация: без ключ → QR за записване; с ключ → код,
    // освен ако устройството е запомнено (валидно trusted_device cookie).
    if (user.twoFactorMode !== 'NOT_REQUIRED') {
      const trusted =
        user.twoFactorMode === 'REQUIRED' &&
        (await this.isTrustedDevice(user.id, trustedDeviceToken));
      if (!trusted) {
        return this.createTwoFactorChallenge(user, loginDto);
      }
    }

    return this.issueLogin(user, loginDto.rememberMe, loginDto.acceptTerms);
  }

  // ---- Двуфакторна автентикация -------------------------------------------

  private async isTrustedDevice(
    userId: string,
    token?: string,
  ): Promise<boolean> {
    if (!token) return false;
    const device = await this.prisma.trustedDevice.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!device || device.userId !== userId || device.expiresAt < new Date()) {
      return false;
    }
    await this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  private async createTwoFactorChallenge(
    user: { id: string; email: string; twoFactorMode: string },
    loginDto: LoginDto,
  ): Promise<TwoFactorChallengeResult> {
    const setup = user.twoFactorMode === 'NOT_SETUP';
    const secret = setup ? authenticator.generateSecret() : null;

    // Стари незавършени входове на същия потребител се чистят
    await this.prisma.twoFactorChallenge.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });
    const challenge = await this.prisma.twoFactorChallenge.create({
      data: {
        userId: user.id,
        purpose: setup ? 'SETUP' : 'LOGIN',
        pendingSecret: secret ? encryptSecret(secret) : null,
        rememberMe: !!loginDto.rememberMe,
        acceptTerms: !!loginDto.acceptTerms,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    if (!setup || !secret) {
      return { twoFactor: { challengeId: challenge.id, setup: false } };
    }
    const otpauth = authenticator.keyuri(user.email, TWO_FACTOR_ISSUER, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth, {
      margin: 1,
      width: 220,
    });
    return {
      twoFactor: {
        challengeId: challenge.id,
        setup: true,
        qrDataUrl,
        manualKey: secret,
      },
    };
  }

  /**
   * Втора стъпка на входа: проверява кода от приложението. При SETUP
   * записва ключа на потребителя (режим REQUIRED). Връща същия резултат
   * като login() плюс токен за запомняне на устройството (30 дни).
   */
  async verifyTwoFactor(dto: VerifyTwoFactorDto, userAgent?: string) {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { id: dto.challengeId },
    });
    if (
      !challenge ||
      challenge.expiresAt < new Date() ||
      challenge.attempts >= CHALLENGE_MAX_ATTEMPTS
    ) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: challenge.userId },
      include: {
        userCompanies: {
          include: { company: { include: { currency: true } }, role: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });
    const defaultUserCompany =
      user?.userCompanies.find((uc) => uc.isDefault && uc.company.isActive) ||
      user?.userCompanies.find((uc) => uc.company.isActive);
    if (
      !user ||
      !user.isActive ||
      !user.loginEnabled ||
      !defaultUserCompany
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const encrypted =
      challenge.purpose === 'SETUP'
        ? challenge.pendingSecret
        : user.twoFactorSecret;
    const secret = encrypted ? decryptSecretIfNeeded(encrypted) : null;
    const valid = !!secret && authenticator.check(dto.code, secret);
    if (!valid) {
      await this.prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired code');
    }

    // Първо записване: ключът става ключ на потребителя
    if (challenge.purpose === 'SETUP') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorSecret: encrypted,
          twoFactorMode: 'REQUIRED',
          twoFactorEnabledAt: new Date(),
        },
      });
    }
    await this.prisma.twoFactorChallenge.delete({
      where: { id: challenge.id },
    });

    // Запомняне на устройството
    const trustedDeviceToken = randomBytes(32).toString('hex');
    await this.prisma.trustedDevice.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(trustedDeviceToken),
        userAgent: userAgent?.slice(0, 255) || null,
        expiresAt: new Date(
          Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });
    await this.prisma.trustedDevice.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user;
    const result = await this.issueLogin(
      { ...safeUser, defaultUserCompany },
      challenge.rememberMe,
      challenge.acceptTerms,
    );
    return { ...result, trustedDeviceToken };
  }

  /** Cookie за запомненото устройство — както access_token, но винаги 30 дни */
  getTrustedDeviceCookieOptions() {
    return {
      ...this.getCookieOptions(true),
      maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
    };
  }

  /** Издава JWT и форматира потребителя за frontend (общо за login и 2FA) */
  private async issueLogin(
    user: Awaited<ReturnType<AuthService['validateUser']>>,
    rememberMe?: boolean,
    acceptTerms?: boolean,
  ) {
    // Record terms acceptance if user accepted terms during login
    if (acceptTerms && !user.termsAcceptedAt) {
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
    const expiresIn = rememberMe ? '30d' : '1d';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    // Форматираме потребителя за frontend
    const currentCompany = user.defaultUserCompany.company;
    const currentRole = {
      ...user.defaultUserCompany.role,
      permissions: normalizePermissions(
        user.defaultUserCompany.role.permissions as any,
      ),
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        phone: user.phone,
        isActive: user.isActive,
        isSuperAdmin: currentCompany.role === 'OWNER',
        termsAcceptedAt: user.termsAcceptedAt,
        currentCompany,
        currentRole,
        partnerCustomerId: user.defaultUserCompany.partnerCustomerId ?? null,
        companies: user.userCompanies.map((uc) => ({
          id: uc.company.id,
          name: uc.company.name,
          eik: uc.company.eik,
          role: uc.role,
          isDefault: uc.isDefault,
        })),
      },
      accessToken,
      rememberMe: rememberMe || false,
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
      partnerCustomerId: userCompany.partnerCustomerId ?? null,
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
        sameSite: 'none' as const,
        maxAge,
        path: '/',
        domain: '.cortanasoft.com',
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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
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
    // Case-insensitive, за да съвпада с поведението при логин (а имейлът вече е
    // трим-нат + lowercase от DTO-то).
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    // Always return success to prevent email enumeration. Служител без
    // достъп (loginEnabled=false) също не получава линк.
    if (!user || !user.isActive || !user.loginEnabled) {
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
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailService.send({
        to: user.email,
        subject: 'Възстановяване на парола — CortanaSoft',
        html: `<!DOCTYPE html>
<html lang="bg">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">CortanaSoft</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Възстановяване на парола</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#18181b;font-size:22px;font-weight:600;">Здравейте, ${user.firstName}!</h2>

              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.7;">
                Получихме заявка за промяна на паролата Ви. Натиснете бутона по-долу, за да зададете нова парола.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Задай нова парола &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fef9c3;border:1px solid #fde68a;border-radius:8px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      &#128274; <strong>Линкът е валиден 1 час.</strong> Ако не сте заявили промяна на паролата, игнорирайте този имейл — паролата Ви няма да бъде променена.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;text-align:center;">
                Ако бутонът не работи, копирайте този линк в браузъра:<br>
                <a href="${resetUrl}" style="color:#4f46e5;text-decoration:none;word-break:break-all;font-size:11px;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;color:#71717a;font-size:13px;text-align:center;">
                CortanaSoft &mdash; Вашият бизнес, една платформа.
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} CortanaSoft. Всички права запазени.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
    }

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new BadRequestException(
        'Невалиден или изтекъл линк за промяна на парола',
      );
    }

    if (resetRecord.usedAt) {
      throw new BadRequestException('Този линк вече е бил използван');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Линкът е изтекъл. Моля, заявете нов.');
    }

    if (!resetRecord.user.loginEnabled) {
      throw new BadRequestException(
        'Невалиден или изтекъл линк за промяна на парола',
      );
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
