import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';
import { JwtPayload } from './strategies/jwt.strategy';

export const IMPERSONATION_TTL_MS = 60 * 60 * 1000;

/**
 * „Влез като" (Odoo „Log in as"): Super Admin получава истински JWT на друг
 * потребител за 1 час; оригиналният му токен се пази в отделна бисквитка и
 * се връща с stop(). Всяко влизане се логва (impersonation_logs).
 */
@Injectable()
export class ImpersonationService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async start(
    adminId: string,
    targetUserId: string,
    companyId: string,
    ip?: string,
  ) {
    if (adminId === targetUserId) {
      throw new BadRequestException(ErrorMessages.impersonation.self);
    }
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: targetUserId, companyId } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        company: { select: { role: true, isActive: true, name: true } },
      },
    });
    if (!membership || !membership.user.isActive) {
      throw new NotFoundException(ErrorMessages.users.notFound);
    }
    // Никога в акаунт от фирмата-собственик — това би било „стани друг админ"
    if (membership.company.role === 'OWNER') {
      throw new ForbiddenException(ErrorMessages.impersonation.ownerCompany);
    }
    if (!membership.company.isActive) {
      throw new BadRequestException(
        ErrorMessages.impersonation.companyInactive,
      );
    }

    await this.prisma.impersonationLog.create({
      data: { adminId, userId: targetUserId, companyId, ip: ip ?? null },
    });
    const payload: JwtPayload = {
      sub: targetUserId,
      email: membership.user.email,
      companyId,
      roleId: membership.roleId,
      impersonatedBy: adminId,
    };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '1h' }),
      user: membership.user,
      companyName: membership.company.name,
    };
  }

  /**
   * Връщане към админа: не пазим стария му токен — издаваме нов по
   * `impersonatedBy` от текущия (подписан) токен, след проверка, че админът
   * е активен и още е в OWNER фирма.
   */
  async stop(impersonated: { id: string; impersonatedBy: string | null }) {
    if (!impersonated.impersonatedBy) {
      throw new BadRequestException(ErrorMessages.impersonation.notActive);
    }
    const admin = await this.prisma.user.findUnique({
      where: { id: impersonated.impersonatedBy },
      include: {
        userCompanies: {
          where: { company: { role: 'OWNER', isActive: true } },
          include: { company: { select: { id: true } } },
          orderBy: { isDefault: 'desc' },
          take: 1,
        },
      },
    });
    const membership = admin?.userCompanies[0];
    if (!admin || !admin.isActive || !admin.loginEnabled || !membership) {
      throw new ForbiddenException(ErrorMessages.impersonation.notActive);
    }
    await this.prisma.impersonationLog.updateMany({
      where: { adminId: admin.id, userId: impersonated.id, endedAt: null },
      data: { endedAt: new Date() },
    });
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      companyId: membership.companyId,
      roleId: membership.roleId,
    };
    return {
      adminToken: this.jwt.sign(payload, { expiresIn: '1d' }),
      companyId: membership.companyId,
    };
  }

  /** Одит за фирма — за страницата на компанията в администрацията */
  async listForCompany(companyId: string, limit = 50) {
    const logs = await this.prisma.impersonationLog.findMany({
      where: { companyId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    const ids = [...new Set(logs.flatMap((l) => [l.adminId, l.userId]))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return logs.map((l) => ({
      ...l,
      admin: byId.get(l.adminId) ?? null,
      user: byId.get(l.userId) ?? null,
    }));
  }
}
