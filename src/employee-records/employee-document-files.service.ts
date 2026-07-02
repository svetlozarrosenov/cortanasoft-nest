import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { EmployeeDocumentFileKind } from '@prisma/client';

// Полиморфна карта: тип родител → FK колона в employee_document_files
const ENTITY_TYPE_MAP = {
  employmentContract: 'employmentContractId',
  employmentAnnex: 'employmentAnnexId',
  employmentOrder: 'employmentOrderId',
  jobDescription: 'jobDescriptionId',
  termination: 'terminationId',
  employeeDocument: 'employeeDocumentId',
  employeeSubmission: 'employeeSubmissionId',
} as const;

type EntityType = keyof typeof ENTITY_TYPE_MAP;

// Имената на Prisma моделите съвпадат с ключовете (camelCase)
const ENTITY_MODEL_MAP: Record<EntityType, string> = {
  employmentContract: 'employmentContract',
  employmentAnnex: 'employmentAnnex',
  employmentOrder: 'employmentOrder',
  jobDescription: 'jobDescription',
  termination: 'termination',
  employeeDocument: 'employeeDocument',
  employeeSubmission: 'employeeSubmission',
};

@Injectable()
export class EmployeeDocumentFilesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private audit: EmployeeRecordAuditService,
  ) {}

  async upload(
    companyId: string,
    userId: string,
    entityType: string,
    entityId: string,
    file: Express.Multer.File,
    kind?: EmployeeDocumentFileKind,
  ) {
    if (!ENTITY_TYPE_MAP[entityType as EntityType]) {
      throw new BadRequestException(
        `Невалиден тип: ${entityType}. Позволени: ${Object.keys(ENTITY_TYPE_MAP).join(', ')}`,
      );
    }

    const type = entityType as EntityType;
    const fkField = ENTITY_TYPE_MAP[type];

    // Tenant check — родителят трябва да съществува в тази компания
    await this.validateEntity(companyId, type, entityId);

    // R2 (private) — отделна папка за трудовите досиета
    const { key } = await this.uploads.uploadFile(
      companyId,
      'employee-records',
      file,
    );

    const created = await this.prisma.employeeDocumentFile.create({
      data: {
        fileName: file.originalname,
        fileUrl: key,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        kind: kind ?? 'ATTACHMENT',
        companyId,
        uploadedById: userId,
        [fkField]: entityId,
      },
    });

    await this.audit.log(companyId, {
      action: 'CREATE',
      actorId: userId,
      entityType: 'file',
      entityId: created.id,
      detail: created.fileName,
    });

    return created;
  }

  async findByEntity(companyId: string, entityType: string, entityId: string) {
    if (!ENTITY_TYPE_MAP[entityType as EntityType]) {
      throw new BadRequestException(`Невалиден тип: ${entityType}`);
    }
    const fkField = ENTITY_TYPE_MAP[entityType as EntityType];
    return this.prisma.employeeDocumentFile.findMany({
      where: { companyId, [fkField]: entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const file = await this.prisma.employeeDocumentFile.findFirst({
      where: { id, companyId },
    });
    if (!file) {
      throw new NotFoundException('Файлът не е намерен');
    }
    return file;
  }

  async getFileStream(companyId: string, id: string, actor?: { id: string }) {
    const file = await this.findOne(companyId, id);
    const stream = await this.uploads.getFile(file.fileKey);
    await this.audit.log(companyId, {
      action: 'DOWNLOAD',
      actorId: actor?.id ?? null,
      entityType: 'file',
      entityId: id,
      detail: file.fileName,
    });
    return { ...stream, fileName: file.fileName };
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const file = await this.findOne(companyId, id);
    await this.uploads.deleteFile(file.fileKey);
    await this.prisma.employeeDocumentFile.delete({ where: { id } });
    await this.audit.log(companyId, {
      action: 'DELETE',
      actorId: actorId ?? null,
      entityType: 'file',
      entityId: id,
      detail: file.fileName,
    });
    return { message: 'Файлът е изтрит успешно' };
  }

  private async validateEntity(
    companyId: string,
    entityType: EntityType,
    entityId: string,
  ): Promise<void> {
    const modelName = ENTITY_MODEL_MAP[entityType];
    const entity = await (this.prisma[modelName] as any).findFirst({
      where: { id: entityId, companyId },
      select: { id: true },
    });
    if (!entity) {
      throw new NotFoundException(
        `${entityType} с ID ${entityId} не е намерен в тази компания`,
      );
    }
  }
}
