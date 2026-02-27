import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

const ENTITY_TYPE_MAP = {
  goodsReceipt: 'goodsReceiptId',
  invoice: 'invoiceId',
  expense: 'expenseId',
  purchaseOrder: 'purchaseOrderId',
  stockDocument: 'stockDocumentId',
} as const;

type EntityType = keyof typeof ENTITY_TYPE_MAP;

const ENTITY_MODEL_MAP: Record<EntityType, string> = {
  goodsReceipt: 'goodsReceipt',
  invoice: 'invoice',
  expense: 'expense',
  purchaseOrder: 'purchaseOrder',
  stockDocument: 'stockDocument',
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async upload(
    companyId: string,
    userId: string,
    entityType: string,
    entityId: string,
    file: Express.Multer.File,
  ) {
    if (!ENTITY_TYPE_MAP[entityType as EntityType]) {
      throw new BadRequestException(
        `Невалиден тип: ${entityType}. Позволени: ${Object.keys(ENTITY_TYPE_MAP).join(', ')}`,
      );
    }

    const type = entityType as EntityType;
    const fkField = ENTITY_TYPE_MAP[type];

    // Validate entity exists AND belongs to this company (tenant check)
    await this.validateEntity(companyId, type, entityId);

    // Upload to R2 (private — no public URL)
    const { key } = await this.uploads.uploadFile(
      companyId,
      'documents',
      file,
    );

    // Create document record — fileUrl is the R2 key, proxy URL built by controller
    return this.prisma.document.create({
      data: {
        fileName: file.originalname,
        fileUrl: key,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        companyId,
        uploadedById: userId,
        [fkField]: entityId,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findByEntity(
    companyId: string,
    entityType: string,
    entityId: string,
  ) {
    if (!ENTITY_TYPE_MAP[entityType as EntityType]) {
      throw new BadRequestException(`Невалиден тип: ${entityType}`);
    }

    const fkField = ENTITY_TYPE_MAP[entityType as EntityType];

    return this.prisma.document.findMany({
      where: {
        companyId,
        [fkField]: entityId,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Документът не е намерен');
    }

    return document;
  }

  async remove(companyId: string, id: string) {
    const document = await this.findOne(companyId, id);

    // Delete from R2
    await this.uploads.deleteFile(document.fileKey);

    // Delete from DB
    await this.prisma.document.delete({ where: { id } });

    return { message: 'Документът е изтрит успешно' };
  }

  async getFileStream(companyId: string, id: string) {
    const document = await this.findOne(companyId, id);
    const file = await this.uploads.getFile(document.fileKey);

    return {
      ...file,
      fileName: document.fileName,
    };
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
