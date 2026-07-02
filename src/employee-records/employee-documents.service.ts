import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import {
  CreateEmployeeDocumentDto,
  UpdateEmployeeDocumentDto,
} from './dto';

@Injectable()
export class EmployeeDocumentsService {
  constructor(
    private prisma: PrismaService,
    private audit: EmployeeRecordAuditService,
  ) {}

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
    const doc = await this.prisma.employeeDocument.create({
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

    await this.audit.log(companyId, {
      action: 'CREATE',
      actorId: userId,
      targetUserId: dto.userId,
      entityType: 'employeeDocument',
      entityId: doc.id,
      detail: doc.title,
    });

    return doc;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmployeeDocumentDto,
    actorId?: string,
  ) {
    const existing = await this.findOne(companyId, id);
    const updated = await this.prisma.employeeDocument.update({
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

    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employeeDocument',
      entityId: id,
      detail: existing.title,
    });

    return updated;
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const existing = await this.findOne(companyId, id);
    await this.prisma.employeeDocument.delete({ where: { id } });
    await this.audit.log(companyId, {
      action: 'DELETE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employeeDocument',
      entityId: id,
      detail: existing.title,
    });
    return { message: 'Документът е изтрит успешно' };
  }
}
