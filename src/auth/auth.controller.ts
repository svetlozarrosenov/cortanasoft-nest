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
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, accessToken, rememberMe } =
      await this.authService.login(loginDto);

    response.cookie(
      'access_token',
      accessToken,
      this.authService.getCookieOptions(rememberMe),
    );

    return {
      success: true,
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      path: '/',
    });

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
}
