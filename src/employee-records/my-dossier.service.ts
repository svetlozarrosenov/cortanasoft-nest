import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';

const FILES_INCLUDE = {
  files: { orderBy: { createdAt: 'desc' as const } },
};

/**
 * „Моето досие" — непрекъснат и безплатен достъп на служителя до
 * електронните документи в досието му (чл. 14 от наредбата). Всичко тук е
 * двойно скопирано: companyId (тенант) + userId от JWT (собственост).
 */
@Injectable()
export class MyDossierService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private audit: EmployeeRecordAuditService,
  ) {}

  /** Агрегиран изглед на собственото досие. */
  async overview(companyId: string, userId: string) {
    const [contracts, orders, documents, terminations] = await Promise.all([
      this.prisma.employmentContract.findMany({
        where: { companyId, userId },
        include: {
          ...FILES_INCLUDE,
          annexes: {
            orderBy: { effectiveDate: 'desc' },
            include: FILES_INCLUDE,
          },
          termination: { include: FILES_INCLUDE },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.employmentOrder.findMany({
        where: { companyId, userId },
        include: FILES_INCLUDE,
        orderBy: { date: 'desc' },
      }),
      this.prisma.employeeDocument.findMany({
        where: { companyId, userId },
        include: FILES_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.termination.findMany({
        where: { companyId, userId },
        include: FILES_INCLUDE,
        orderBy: { date: 'desc' },
      }),
    ]);

    // Длъжностни характеристики за длъжността по активния договор (справка)
    const position =
      contracts.find((c) => c.status === 'ACTIVE')?.position ||
      contracts[0]?.position ||
      null;
    const jobDescriptions = position
      ? await this.prisma.jobDescription.findMany({
          where: { companyId, position },
          include: FILES_INCLUDE,
          orderBy: { version: 'desc' },
        })
      : [];

    await this.audit.log(companyId, {
      action: 'VIEW',
      actorId: userId,
      targetUserId: userId,
      entityType: 'dossier',
      detail: 'Преглед на собственото досие',
    });

    return { contracts, orders, documents, terminations, jobDescriptions, position };
  }

  /**
   * Стрийм на файл от собственото досие с проверка на собственост през
   * полиморфния родител. Длъжностните характеристики са per-position и са
   * достъпни за всички служители на компанията.
   */
  async fileStream(companyId: string, fileId: string, userId: string) {
    const file = await this.prisma.employeeDocumentFile.findFirst({
      where: { id: fileId, companyId },
      include: {
        employmentContract: { select: { userId: true } },
        employmentAnnex: { select: { userId: true } },
        employmentOrder: { select: { userId: true } },
        termination: { select: { userId: true } },
        employeeDocument: { select: { userId: true } },
        employeeSubmission: { select: { userId: true } },
        jobDescription: { select: { id: true } },
      },
    });
    if (!file) throw new NotFoundException('Файлът не е намерен');

    const ownerId =
      file.employmentContract?.userId ??
      file.employmentAnnex?.userId ??
      file.employmentOrder?.userId ??
      file.termination?.userId ??
      file.employeeDocument?.userId ??
      file.employeeSubmission?.userId ??
      null;

    const isJobDescription = Boolean(file.jobDescription);
    if (!isJobDescription && ownerId !== userId) {
      throw new ForbiddenException('Нямате достъп до този файл');
    }

    await this.audit.log(companyId, {
      action: 'DOWNLOAD',
      actorId: userId,
      targetUserId: ownerId ?? userId,
      entityType: 'file',
      entityId: fileId,
      detail: file.fileName,
    });

    const stream = await this.uploads.getFile(file.fileKey);
    return { ...stream, fileName: file.fileName };
  }
}
