import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractFileKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class ContractFilesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async upload(
    companyId: string,
    userId: string,
    contractId: string,
    file: Express.Multer.File,
    kind?: ContractFileKind,
  ) {
    // Tenant check — договорът трябва да е в тази компания
    await this.validateContract(companyId, contractId);

    const { key } = await this.uploads.uploadFile(companyId, 'contracts', file);

    return this.prisma.contractFile.create({
      data: {
        fileName: file.originalname,
        fileUrl: key,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        kind: kind ?? 'SIGNED_COPY',
        companyId,
        contractId,
        uploadedById: userId,
      },
    });
  }

  findByContract(companyId: string, contractId: string) {
    return this.prisma.contractFile.findMany({
      where: { companyId, contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const file = await this.prisma.contractFile.findFirst({
      where: { id, companyId },
    });
    if (!file) {
      throw new NotFoundException('Файлът не е намерен');
    }
    return file;
  }

  async getFileStream(companyId: string, id: string) {
    const file = await this.findOne(companyId, id);
    const stream = await this.uploads.getFile(file.fileKey);
    return { ...stream, fileName: file.fileName };
  }

  async remove(companyId: string, id: string) {
    const file = await this.findOne(companyId, id);
    await this.uploads.deleteFile(file.fileKey);
    await this.prisma.contractFile.delete({ where: { id } });
    return { message: 'Файлът е изтрит успешно' };
  }

  private async validateContract(companyId: string, contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, companyId },
      select: { id: true },
    });
    if (!contract) {
      throw new NotFoundException('Договорът не е намерен в тази компания');
    }
  }
}
