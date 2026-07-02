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
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { EvrotrustService } from './evrotrust.service';

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
    private audit: EmployeeRecordAuditService,
    private evrotrust: EvrotrustService,
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

    // AES/QES минават през Евротръст — засега заготовка
    const provider = level === 'SES' ? 'INTERNAL' : 'EVROTRUST';
    if (provider === 'EVROTRUST' && !this.evrotrust.isConfigured()) {
      throw new BadRequestException(
        'Подпис от ниво ' +
          level +
          ' изисква интеграцията с Евротръст, която още не е активирана. Използвайте обикновен подпис (SES) или изчакайте активирането.',
      );
    }

    const request = await this.prisma.employeeSignatureRequest.create({
      data: {
        companyId,
        fileId: dto.fileId,
        signerUserId: dto.signerUserId,
        requestedById: actor.id,
        level,
        provider,
      },
      include: REQUEST_INCLUDE,
    });

    // TODO(evrotrust): при provider EVROTRUST — качване на файла към
    // EvrotrustService.createSignatureRequest() и запис на providerRef.

    this.push
      .sendToUser(dto.signerUserId, {
        title: 'Документ за подписване',
        body: `Очаква вашия подпис: ${file.fileName}`,
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
      // TODO(evrotrust): подписването при Евротръст става в тяхното
      // приложение; тук само ще проверяваме статуса по providerRef.
      throw new BadRequestException(
        'Тази заявка се подписва през приложението на Евротръст',
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
}
