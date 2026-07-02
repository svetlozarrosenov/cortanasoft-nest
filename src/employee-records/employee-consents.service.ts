import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeConsentAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

/**
 * Съгласие на служителя да е адресат на електронни изявления (чл. 4 от
 * наредбата). Append-only история; активното състояние е последният ред.
 * Може да се даде/оттегли от самия служител (Моето досие) или да се
 * регистрира от HR (напр. когато е дадено в трудовия договор — чл. 4, ал. 1).
 */
@Injectable()
export class EmployeeConsentsService {
  constructor(
    private prisma: PrismaService,
    private audit: EmployeeRecordAuditService,
  ) {}

  private async ensureEmployee(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { userId: true },
    });
    if (!membership) {
      throw new NotFoundException('Служителят не е намерен в компанията');
    }
  }

  /** Текущо състояние: дадено ли е съгласие в момента. */
  async current(companyId: string, userId: string) {
    const last = await this.prisma.employeeConsent.findFirst({
      where: { companyId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      active: last?.action === EmployeeConsentAction.GIVEN,
      last,
    };
  }

  async history(companyId: string, userId: string) {
    const data = await this.prisma.employeeConsent.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  /** Обзор за HR: активното състояние на всички служители. */
  async overview(companyId: string) {
    const rows = await this.prisma.employeeConsent.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, action: true, createdAt: true },
    });
    // Последното действие печели
    const byUser = new Map<
      string,
      { action: EmployeeConsentAction; createdAt: Date }
    >();
    for (const r of rows) {
      byUser.set(r.userId, { action: r.action, createdAt: r.createdAt });
    }
    return {
      data: [...byUser.entries()].map(([userId, v]) => ({
        userId,
        active: v.action === EmployeeConsentAction.GIVEN,
        at: v.createdAt,
      })),
    };
  }

  async record(
    companyId: string,
    targetUserId: string,
    actorId: string,
    dto: { action: EmployeeConsentAction; method?: string; note?: string },
  ) {
    await this.ensureEmployee(companyId, targetUserId);

    const { active } = await this.current(companyId, targetUserId);
    if (dto.action === EmployeeConsentAction.GIVEN && active) {
      throw new BadRequestException('Съгласието вече е дадено');
    }
    if (dto.action === EmployeeConsentAction.WITHDRAWN && !active) {
      throw new BadRequestException('Няма активно съгласие за оттегляне');
    }

    const consent = await this.prisma.employeeConsent.create({
      data: {
        companyId,
        userId: targetUserId,
        actorId,
        action: dto.action,
        method: dto.method ?? null,
        note: dto.note ?? null,
      },
    });

    await this.audit.log(companyId, {
      action:
        dto.action === EmployeeConsentAction.GIVEN
          ? 'CONSENT_GIVEN'
          : 'CONSENT_WITHDRAWN',
      actorId,
      targetUserId,
      entityType: 'employeeConsent',
      entityId: consent.id,
      detail: dto.method || null,
    });

    return consent;
  }
}
