import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEmployeeDocumentDto,
  UpdateEmployeeDocumentDto,
} from './dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    _count: { select: { files: true } },
  };

  async findAll(companyId: string, userId?: string) {
    const data = await this.prisma.employeeDocument.findMany({
      where: { companyId, ...(userId ? { userId } : {}) },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const doc = await this.prisma.employeeDocument.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!doc) {
      throw new NotFoundException('Документът не е намерен');
    }
    return doc;
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateEmployeeDocumentDto,
  ) {
    return this.prisma.employeeDocument.create({
      data: {
        category: dto.category ?? 'OTHER',
        title: dto.title,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
        notes: dto.notes ?? null,
        userId: dto.userId,
        createdById: userId,
        companyId,
      },
      include: this.include,
    });
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDocumentDto) {
    await this.findOne(companyId, id);
    return this.prisma.employeeDocument.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.documentDate !== undefined
          ? {
              documentDate: dto.documentDate
                ? new Date(dto.documentDate)
                : null,
            }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.employeeDocument.delete({ where: { id } });
    return { message: 'Документът е изтрит успешно' };
  }
}
