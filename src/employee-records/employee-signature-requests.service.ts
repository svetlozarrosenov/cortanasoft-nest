import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeSignatureType,
  Prisma,
  SignatureRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { EvrotrustService } from './evrotrust.service';
import { EvrotrustIdentitiesService } from './evrotrust-identities.service';

const REQUEST_INCLUDE = {
  file: {
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      signatureType: true,
      signedAt: true,
    },
  },
} satisfies Prisma.EmployeeSignatureRequestInclude;

/**
 * Заявки за електронен подпис върху файл от досието (чл. 7 от наредбата).
 *
 * INTERNAL (работи от днес): служителят потвърждава в приложението — това е
 * обикновен електронен подпис (SES) по смисъла на eIDAS, допустим за
 * служителя, когато е договорен (чл. 7, ал. 2 + настройката
 * employeeSignatureLevel). Записва се кой, кога и от какъв контекст.
 *
 * EVROTRUST (заготовка): за AES/QES и за КЕП на работодателя (чл. 7, ал. 4)
 * заявката се препраща към EvrotrustService; докато интеграцията не е
 * активирана, създаването на такива заявки връща ясна грешка.
 */
@Injectable()
export class EmployeeSignatureRequestsService {
  private readonly logger = new Logger(EmployeeSignatureRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private push: PushNotificationsService,
    private uploads: UploadsService,
    private audit: EmployeeRecordAuditService,
    private evrotrust: EvrotrustService,
    private identities: EvrotrustIdentitiesService,
  ) {}

  async create(
    companyId: string,
    actor: { id: string; email?: string },
    dto: { fileId: string; signerUserId: string; level?: EmployeeSignatureType },
  ) {
    const file = await this.prisma.employeeDocumentFile.findFirst({
      where: { id: dto.fileId, companyId },
    });
    if (!file) throw new NotFoundException('Файлът не е намерен');

    const signer = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: dto.signerUserId, companyId } },
      select: { userId: true },
    });
    if (!signer) {
      throw new NotFoundException('Подписващият не е служител в компанията');
    }

    const existing = await this.prisma.employeeSignatureRequest.findFirst({
      where: { companyId, fileId: dto.fileId, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException(
        'Вече има чакаща заявка за подпис на този файл',
      );
    }

    // Ниво по подразбиране — от вътрешните правила (чл. 6, ал. 2, т. 2)
    const settings = await this.prisma.employeeRecordsSettings.findUnique({
      where: { companyId },
      select: { employeeSignatureLevel: true },
    });
    const level = dto.level ?? settings?.employeeSignatureLevel ?? 'SES';
    if (level === 'NONE') {
      throw new BadRequestException('Невалидно ниво на подпис');
    }

    // AES/QES минават през Евротръст (OTP eSign по RefID)
    const provider = level === 'SES' ? 'INTERNAL' : 'EVROTRUST';
    if (provider === 'EVROTRUST' && !this.evrotrust.isConfigured()) {
      throw new BadRequestException(
        'Подпис от ниво ' +
          level +
          ' изисква интеграцията с Евротръст, която още не е активирана. Използвайте обикновен подпис (SES) или изчакайте активирането.',
      );
    }

    // EVROTRUST: файлът се изпраща веднага; providerRef = transactionID
    let providerRef: string | null = null;
    if (provider === 'EVROTRUST') {
      const identity = await this.identities.activeIdentity(
        companyId,
        dto.signerUserId,
      );
      if (!identity) {
        throw new BadRequestException(
          'Служителят първо трябва да премине електронна идентификация през Евротръст („Моето досие" → „Електронна идентичност").',
        );
      }
      if (!identity.documentNumber || !identity.firstNameLatin || !identity.lastNameLatin) {
        throw new BadRequestException(
          'Идентичността на служителя е непълна — необходима е нова идентификация.',
        );
      }

      const signerUser = await this.prisma.user.findUnique({
        where: { id: dto.signerUserId },
        select: { email: true },
      });
      const { stream } = await this.uploads.getFile(file.fileKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);

      try {
        const sent = await this.evrotrust.sendDocumentForSigning({
          referenceId: identity.referenceId,
          fileName: file.fileName,
          content: Buffer.concat(chunks),
          mimeType: file.mimeType,
          user: {
            documentNumber: identity.documentNumber,
            firstNameLatin: identity.firstNameLatin,
            lastNameLatin: identity.lastNameLatin,
            phone: identity.phone || undefined,
            email: signerUser?.email || undefined,
            language: 'bg',
          },
          description: `Документ от трудовото досие: ${file.fileName}`,
          certificateType: level === 'QES' ? 1 : 2,
        });
        providerRef = sent.transactionID;
      } catch (err) {
        if ((err as Error).message?.includes('EVROTRUST_REFID_INVALID')) {
          await this.identities.invalidate(companyId, dto.signerUserId);
          throw new BadRequestException(
            'Идентификацията на служителя при Евротръст е невалидна/изтекла — необходима е нова идентификация.',
          );
        }
        throw err;
      }
    }

    const request = await this.prisma.employeeSignatureRequest.create({
      data: {
        companyId,
        fileId: dto.fileId,
        signerUserId: dto.signerUserId,
        requestedById: actor.id,
        level,
        provider,
        providerRef,
      },
      include: REQUEST_INCLUDE,
    });

    this.push
      .sendToUser(dto.signerUserId, {
        title: 'Документ за подписване',
        body:
          provider === 'EVROTRUST'
            ? `Очаква вашия подпис: ${file.fileName}. Ще получите SMS код — въведете го в „Моето досие".`
            : `Очаква вашия подпис: ${file.fileName}`,
        url: `/dashboard/${companyId}/employee-records/my`,
        tag: `signature-${request.id}`,
      })
      .catch((err) => this.logger.error('Failed to push sign request', err));

    await this.audit.log(companyId, {
      action: 'SIGN_REQUEST',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: dto.signerUserId,
      entityType: 'employeeSignatureRequest',
      entityId: request.id,
      detail: `${file.fileName} (${level})`,
    });

    return request;
  }

  async findAll(
    companyId: string,
    query: { signerUserId?: string; fileId?: string; status?: SignatureRequestStatus },
  ) {
    const data = await this.prisma.employeeSignatureRequest.findMany({
      where: {
        companyId,
        ...(query.signerUserId ? { signerUserId: query.signerUserId } : {}),
        ...(query.fileId ? { fileId: query.fileId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findForSigner(companyId: string, signerUserId: string) {
    return this.findAll(companyId, { signerUserId });
  }

  private async loadOwn(companyId: string, id: string, signerUserId: string) {
    const request = await this.prisma.employeeSignatureRequest.findFirst({
      where: { id, companyId },
      include: REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException('Заявката не е намерена');
    if (request.signerUserId !== signerUserId) {
      throw new ForbiddenException('Заявката не е адресирана до вас');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Заявката вече е обработена');
    }
    return request;
  }

  /**
   * Подписване от служителя в приложението (INTERNAL → SES): маркира файла
   * като подписан с обикновен електронен подпис и записва одит следа
   * (кой, кога, е-адрес). За AES/QES потокът ще мине през Евротръст.
   */
  async sign(companyId: string, id: string, signer: { id: string; email?: string }) {
    const request = await this.loadOwn(companyId, id, signer.id);

    if (request.provider !== 'INTERNAL') {
      throw new BadRequestException(
        'Тази заявка се подписва със SMS код от Евротръст — използвайте полето за код.',
      );
    }

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.employeeSignatureRequest.update({
        where: { id },
        data: { status: 'SIGNED', signedAt: now },
        include: REQUEST_INCLUDE,
      }),
      this.prisma.employeeDocumentFile.update({
        where: { id: request.fileId },
        data: { signatureType: 'SES', signedAt: now },
      }),
    ]);

    if (request.requestedById) {
      this.push
        .sendToUser(request.requestedById, {
          title: 'Документ подписан',
          body: `${request.file.fileName} беше подписан`,
          url: `/dashboard/${companyId}/employee-records`,
          tag: `signature-${id}`,
        })
        .catch((err) => this.logger.error('Failed to push signed', err));
    }

    await this.audit.log(companyId, {
      action: 'SIGN',
      actorId: signer.id,
      actorEmail: signer.email ?? null,
      targetUserId: signer.id,
      entityType: 'employeeSignatureRequest',
      entityId: id,
      detail: `${request.file.fileName} — SES (в приложението)`,
    });

    return updated;
  }

  async decline(
    companyId: string,
    id: string,
    signer: { id: string; email?: string },
    reason?: string,
  ) {
    const request = await this.loadOwn(companyId, id, signer.id);

    const updated = await this.prisma.employeeSignatureRequest.update({
      where: { id },
      data: {
        status: 'DECLINED',
        declinedAt: new Date(),
        declineReason: reason ?? null,
      },
      include: REQUEST_INCLUDE,
    });

    if (request.requestedById) {
      this.push
        .sendToUser(request.requestedById, {
          title: 'Отказано подписване',
          body: `${request.file.fileName}${reason ? ` — ${reason}` : ''}`,
          url: `/dashboard/${companyId}/employee-records`,
          tag: `signature-${id}`,
        })
        .catch((err) => this.logger.error('Failed to push declined', err));
    }

    await this.audit.log(companyId, {
      action: 'SIGN_DECLINE',
      actorId: signer.id,
      actorEmail: signer.email ?? null,
      targetUserId: signer.id,
      entityType: 'employeeSignatureRequest',
      entityId: id,
      detail: reason || null,
    });

    return updated;
  }

  /** HR оттегля чакаща заявка. */
  async cancel(companyId: string, id: string, actor: { id: string; email?: string }) {
    const request = await this.prisma.employeeSignatureRequest.findFirst({
      where: { id, companyId },
    });
    if (!request) throw new NotFoundException('Заявката не е намерена');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Само чакащи заявки могат да се оттеглят');
    }
    const updated = await this.prisma.employeeSignatureRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: REQUEST_INCLUDE,
    });
    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actor.id,
      actorEmail: actor.email ?? null,
      targetUserId: request.signerUserId,
      entityType: 'employeeSignatureRequest',
      entityId: id,
      detail: 'CANCELLED',
    });
    return updated;
  }

  /** Има ли конфигуриран Евротръст — за UI бадж „очаква активиране". */
  providerStatus() {
    return { evrotrustConfigured: this.evrotrust.isConfigured() };
  }

  // ==================== Евротръст OTP + webhook ====================

  /** Служителят въвежда SMS кода в нашия UI → активираме подписването. */
  async submitOtp(
    companyId: string,
    id: string,
    signer: { id: string; email?: string },
    code: string,
  ) {
    const request = await this.loadOwn(companyId, id, signer.id);
    if (request.provider !== 'EVROTRUST' || !request.providerRef) {
      throw new BadRequestException('Заявката не се подписва със SMS код');
    }
    if (!code?.trim()) {
      throw new BadRequestException('Въведете кода от SMS-а');
    }

    await this.evrotrust.activateSigning(request.providerRef, code.trim());

    await this.audit.log(companyId, {
      action: 'EVROTRUST_OTP',
      actorId: signer.id,
      actorEmail: signer.email ?? null,
      targetUserId: signer.id,
      entityType: 'employeeSignatureRequest',
      entityId: id,
      detail: `${request.file.fileName} — потвърден SMS код`,
    });

    // Статусът остава PENDING до webhook-а „Signed" от Евротръст
    return { success: true };
  }

  async resendSms(companyId: string, id: string, signer: { id: string }) {
    const request = await this.loadOwn(companyId, id, signer.id);
    if (request.provider !== 'EVROTRUST' || !request.providerRef) {
      throw new BadRequestException('Заявката не се подписва със SMS код');
    }
    const identity = await this.identities.activeIdentity(companyId, signer.id);
    await this.evrotrust.resendActivationSms(
      request.providerRef,
      identity?.phone || undefined,
    );
    return { success: true };
  }

  /**
   * Обработва callback-а /document/offline/ready от Евротръст (или polling
   * резултат). Статуси: 1 Pending, 2 Signed, 3 Rejected, 4 Expired, 5 Failed,
   * 6 Withdrawn, 7 Undeliverable, 8 Failed face recognition, 99 On hold.
   */
  async handleDocumentReady(
    transactionId: string,
    status: number,
    errorDetail?: string,
  ) {
    const request = await this.prisma.employeeSignatureRequest.findFirst({
      where: { providerRef: transactionId, provider: 'EVROTRUST' },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      this.logger.warn(
        `Evrotrust callback за непознат transactionID: ${transactionId}`,
      );
      return { handled: false };
    }
    if (request.status !== 'PENDING') return { handled: true };

    const now = new Date();
    if (status === 2) {
      // Signed — маркираме файла с реалното ниво на подписа.
      // TODO(evrotrust-test): изтегляне на подписания файл (downloadSignedZip)
      // и закачане като SIGNED_COPY — след уточняване на шифъра в тест средата.
      await this.prisma.$transaction([
        this.prisma.employeeSignatureRequest.update({
          where: { id: request.id },
          data: { status: 'SIGNED', signedAt: now },
        }),
        this.prisma.employeeDocumentFile.update({
          where: { id: request.fileId },
          data: { signatureType: request.level, signedAt: now },
        }),
      ]);
      await this.audit.log(request.companyId, {
        action: 'SIGN',
        actorId: request.signerUserId,
        targetUserId: request.signerUserId,
        entityType: 'employeeSignatureRequest',
        entityId: request.id,
        detail: `${request.file.fileName} — подписан през Евротръст (${request.level})`,
      });
    } else if (status === 3) {
      await this.prisma.employeeSignatureRequest.update({
        where: { id: request.id },
        data: {
          status: 'DECLINED',
          declinedAt: now,
          declineReason: errorDetail || 'Отказано от подписващия (Евротръст)',
        },
      });
    } else if (status === 6) {
      await this.prisma.employeeSignatureRequest.update({
        where: { id: request.id },
        data: { status: 'CANCELLED' },
      });
    } else if ([4, 5, 7, 8].includes(status)) {
      const reasons: Record<number, string> = {
        4: 'Изтекъл срок за подписване',
        5: 'Грешка при Евротръст',
        7: 'Недоставим до потребителя',
        8: 'Неуспешно лицево разпознаване',
      };
      await this.prisma.employeeSignatureRequest.update({
        where: { id: request.id },
        data: {
          status: 'FAILED',
          declineReason: errorDetail || reasons[status] || `Статус ${status}`,
        },
      });
    } else {
      return { handled: true }; // 1 Pending / 99 On hold — нищо за правене
    }

    if (request.requestedById) {
      this.push
        .sendToUser(request.requestedById, {
          title: status === 2 ? 'Документ подписан (Евротръст)' : 'Неуспешно подписване',
          body: request.file.fileName,
          url: `/dashboard/${request.companyId}/employee-records`,
          tag: `signature-${request.id}`,
        })
        .catch((err) => this.logger.error('Failed to push webhook result', err));
    }

    return { handled: true };
  }
}
