import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EvrotrustService } from './evrotrust.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { decryptSecret } from './crypto.util';

const IDENTITY_VALIDITY_DAYS = 365; // RefID важи 1 година за OTP eSign

/**
 * Електронните идентичности на служителите при Евротръст (Поток 1).
 * Служителят се идентифицира еднократно през Evrotrust Web SDK; полученият
 * RefID се пази тук и позволява подписване само със SMS код за 1 година.
 */
@Injectable()
export class EvrotrustIdentitiesService {
  private readonly logger = new Logger(EvrotrustIdentitiesService.name);

  constructor(
    private prisma: PrismaService,
    private evrotrust: EvrotrustService,
    private audit: EmployeeRecordAuditService,
  ) {}

  /** Текущо състояние за служителя (с lazy изтичане). */
  async status(companyId: string, userId: string) {
    const identity = await this.prisma.evrotrustIdentity.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (
      identity &&
      identity.status === 'ACTIVE' &&
      identity.expiresAt < new Date()
    ) {
      await this.prisma.evrotrustIdentity.update({
        where: { id: identity.id },
        data: { status: 'EXPIRED' },
      });
      identity.status = 'EXPIRED';
    }
    return {
      configured: this.evrotrust.isConfigured(),
      identity: identity
        ? {
            status: identity.status,
            identifiedAt: identity.identifiedAt,
            expiresAt: identity.expiresAt,
          }
        : null,
      active: identity?.status === 'ACTIVE',
    };
  }

  /** Активна идентичност или null — за подписващия поток. */
  async activeIdentity(companyId: string, userId: string) {
    const { active } = await this.status(companyId, userId);
    if (!active) return null;
    return this.prisma.evrotrustIdentity.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
  }

  /**
   * Стартира идентификация: записва съгласието с ОУ на Евротръст (изискване
   * на интеграцията) и връща form полетата за браузърния POST към Evrotrust Web.
   */
  async startIdentification(
    companyId: string,
    user: { id: string; email?: string },
  ) {
    // ЕГН от HR профила (ако е попълнено) — за насрещна проверка при скана
    let userPid: string | undefined;
    try {
      const membership = await this.prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: user.id, companyId } },
        select: { personalIdEncrypted: true },
      });
      if (membership?.personalIdEncrypted) {
        userPid = decryptSecret(membership.personalIdEncrypted) || undefined;
      }
    } catch {
      // Без ЕГН проверка, ако профилът липсва/не се декриптира
    }

    const externalReference = `${user.id.slice(0, 16)}-${randomBytes(6).toString('hex')}`;
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://cortanasoft.com'}/dashboard/${companyId}/employee-records/evrotrust-return`;

    const start = await this.evrotrust.buildIdentificationStart({
      redirectUrl,
      externalReference,
      lang: 'bg',
      userPid,
    });

    // Одит: приемане на ОУ на Евротръст (frontend-ът показва чекбокса преди старта)
    await this.audit.log(companyId, {
      action: 'EVROTRUST_TERMS',
      actorId: user.id,
      actorEmail: user.email ?? null,
      targetUserId: user.id,
      entityType: 'evrotrustIdentity',
      detail: 'Прието съгласие с ОУ на Евротръст; стартирана идентификация',
    });

    return start;
  }

  /**
   * Потвърждава идентификацията след връщането от Evrotrust Web: валидира
   * RefID, дърпа верифицираните данни (задължително — в 2-часовия прозорец)
   * и записва идентичността.
   */
  async confirmIdentification(
    companyId: string,
    user: { id: string; email?: string },
    referenceId: string,
  ) {
    if (!referenceId?.trim()) {
      throw new BadRequestException('Липсва референция от Евротръст');
    }

    const validation = await this.evrotrust.validateRefId(referenceId);
    if (validation && validation.valid === false) {
      throw new BadRequestException(
        'Референцията от Евротръст е невалидна или изтекла. Опитайте идентификацията отново.',
      );
    }
    const data = await this.evrotrust.getUserData(referenceId);
    const u = data.user || {};

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + IDENTITY_VALIDITY_DAYS);

    const identity = await this.prisma.evrotrustIdentity.upsert({
      where: { companyId_userId: { companyId, userId: user.id } },
      create: {
        companyId,
        userId: user.id,
        referenceId,
        identifiedAt: new Date(),
        expiresAt,
        status: 'ACTIVE',
        documentNumber: (u.documentNumber as string) || null,
        firstNameLatin: (u.firstNameLatin as string) || null,
        lastNameLatin: (u.lastNameLatin as string) || null,
        phone: (u.phone as string) || null,
      },
      update: {
        referenceId,
        identifiedAt: new Date(),
        expiresAt,
        status: 'ACTIVE',
        documentNumber: (u.documentNumber as string) || null,
        firstNameLatin: (u.firstNameLatin as string) || null,
        lastNameLatin: (u.lastNameLatin as string) || null,
        phone: (u.phone as string) || null,
      },
    });

    await this.audit.log(companyId, {
      action: 'EVROTRUST_IDENTIFICATION',
      actorId: user.id,
      actorEmail: user.email ?? null,
      targetUserId: user.id,
      entityType: 'evrotrustIdentity',
      entityId: identity.id,
      detail: `Идентификация през Evrotrust Web SDK (валидна до ${expiresAt.toLocaleDateString('bg-BG')})`,
    });

    return this.status(companyId, user.id);
  }

  /** Маркира идентичността за невалидна (напр. при грешка 485/487). */
  async invalidate(companyId: string, userId: string) {
    await this.prisma.evrotrustIdentity.updateMany({
      where: { companyId, userId },
      data: { status: 'INVALIDATED' },
    });
  }
}
