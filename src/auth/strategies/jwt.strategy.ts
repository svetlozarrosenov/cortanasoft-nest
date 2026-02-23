import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  roleId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Намираме текущата компания от JWT payload
    const currentUserCompany = user.userCompanies.find(
      (uc) => uc.companyId === payload.companyId,
    );

    if (!currentUserCompany) {
      throw new UnauthorizedException('Invalid company access');
    }

    if (!currentUserCompany.company.isActive) {
      throw new UnauthorizedException('Company is inactive');
    }

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      currentCompany: currentUserCompany.company,
      currentRole: currentUserCompany.role,
      isSuperAdmin: currentUserCompany.company.role === 'OWNER',
      companies: user.userCompanies.map((uc) => ({
        id: uc.company.id,
        name: uc.company.name,
        eik: uc.company.eik,
        role: uc.role,
        isDefault: uc.isDefault,
      })),
    };
  }
}
