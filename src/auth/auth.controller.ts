import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS_CONFIG } from '../common/config/permissions.config';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  // Per real client IP (nginx sets X-Forwarded-For, trust proxy is on). Kept
  // generous so an office behind one NAT IP isn't locked out during the morning
  // login rush, while still throttling automated brute-force to a crawl.
  @Throttle({
    short: { limit: 15, ttl: 60000 },
    long: { limit: 60, ttl: 600000 },
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const trustedDeviceToken = (
      request.cookies as Record<string, string> | undefined
    )?.trusted_device;
    const result = await this.authService.login(loginDto, trustedDeviceToken);

    // Втора стъпка: без cookie, клиентът показва QR / поле за код
    if ('twoFactor' in result) {
      return { success: true, twoFactor: result.twoFactor };
    }

    response.cookie(
      'access_token',
      result.accessToken,
      this.authService.getCookieOptions(result.rememberMe),
    );

    return {
      success: true,
      user: result.user,
    };
  }

  // Двуфакторна автентикация: код от приложението (и първо записване на ключа)
  @Post('2fa/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    long: { limit: 30, ttl: 600000 },
  })
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, rememberMe, trustedDeviceToken } =
      await this.authService.verifyTwoFactor(dto, request.get('user-agent'));

    response.cookie(
      'access_token',
      accessToken,
      this.authService.getCookieOptions(rememberMe),
    );
    response.cookie(
      'trusted_device',
      trustedDeviceToken,
      this.authService.getTrustedDeviceCookieOptions(),
    );

    return { success: true, user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', this.authService.getCookieOptions());

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: any) {
    return {
      success: true,
      user,
    };
  }

  @Post('switch-company/:companyId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async switchCompany(
    @CurrentUser() user: any,
    @Param('companyId') companyId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.switchCompany(user.id, companyId);

    response.cookie(
      'access_token',
      result.accessToken,
      this.authService.getCookieOptions(),
    );

    return {
      success: true,
      currentCompany: result.currentCompany,
      currentRole: result.currentRole,
      isSuperAdmin: result.isSuperAdmin,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    long: { limit: 10, ttl: 600000 },
  })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 20, ttl: 600000 },
  })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('permissions-config')
  @UseGuards(JwtAuthGuard)
  async getPermissionsConfig() {
    return {
      success: true,
      config: PERMISSIONS_CONFIG,
    };
  }
}
