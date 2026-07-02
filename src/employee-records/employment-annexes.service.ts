import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { CreateEmploymentAnnexDto, UpdateEmploymentAnnexDto } from './dto';

@Injectable()
export class EmploymentAnnexesService {
  constructor(
    private prisma: PrismaService,
    private numbering: EmployeeRecordNumberingService,
    private audit: EmployeeRecordAuditService,
  ) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    contract: { select: { id: true, number: true } },
    _count: { select: { files: true } },
  };

  async findAll(companyId: string, opts: { contractId?: string; userId?: string }) {
    const data = await this.prisma.employmentAnnex.findMany({
      where: {
        companyId,
        ...(opts.contractId ? { contractId: opts.contractId } : {}),
        ...(opts.userId ? { userId: opts.userId } : {}),
      },
      include: this.include,
      orderBy: { effectiveDate: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const annex = await this.prisma.employmentAnnex.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!annex) throw new NotFoundException('Допълнителното споразумение не е намерено');
    return annex;
  }

  async create(companyId: string, userId: string, dto: CreateEmploymentAnnexDto) {
    // Договорът трябва да съществува в тази компания
    const contract = await this.prisma.employmentContract.findFirst({
      where: { id: dto.contractId, companyId },
      select: { id: true },
    });
    if (!contract) throw new NotFoundException('Трудовият договор не е намерен');

    const annex = await this.prisma.$transaction(async (tx) => {
      const number =
        dto.number || (await this.numbering.next('annex', companyId, tx));
      const created = await tx.employmentAnnex.create({
        data: {
          number,
          effectiveDate: new Date(dto.effectiveDate),
          reason: dto.reason ?? null,
          newSalary: dto.newSalary ?? null,
          newPosition: dto.newPosition ?? null,
          newWorkingHours: dto.newWorkingHours ?? null,
          newEndDate: dto.newEndDate ? new Date(dto.newEndDate) : null,
          notes: dto.notes ?? null,
          userId: dto.userId,
          createdById: userId,
          contractId: dto.contractId,
          companyId,
        },
        include: this.include,
      });
      // Договорът е изменен → статус AMENDED (ако още е действащ)
      await tx.employmentContract.updateMany({
        where: { id: dto.contractId, status: 'ACTIVE' },
        data: { status: 'AMENDED' },
      });
      return created;
    });

    await this.audit.log(companyId, {
      action: 'CREATE',
      actorId: userId,
      targetUserId: dto.userId,
      entityType: 'employmentAnnex',
      entityId: annex.id,
      detail: `Допълнително споразумение ${annex.number}`,
    });

    return annex;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmploymentAnnexDto,
    actorId?: string,
  ) {
    const existing = await this.findOne(companyId, id);
    const updated = await this.prisma.employmentAnnex.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.effectiveDate !== undefined
          ? { effectiveDate: new Date(dto.effectiveDate) }
          : {}),
        ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
        ...(dto.newSalary !== undefined ? { newSalary: dto.newSalary } : {}),
        ...(dto.newPosition !== undefined ? { newPosition: dto.newPosition } : {}),
        ...(dto.newWorkingHours !== undefined
          ? { newWorkingHours: dto.newWorkingHours }
          : {}),
        ...(dto.newEndDate !== undefined
          ? { newEndDate: dto.newEndDate ? new Date(dto.newEndDate) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: this.include,
    });

    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employmentAnnex',
      entityId: id,
      detail: `Допълнително споразумение ${existing.number}`,
    });

    return updated;
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const existing = await this.findOne(companyId, id);
    await this.prisma.employmentAnnex.delete({ where: { id } });
    await this.audit.log(companyId, {
      action: 'DELETE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employmentAnnex',
      entityId: id,
      detail: `Допълнително споразумение ${existing.number}`,
    });
    return { message: 'Допълнителното споразумение е изтрито успешно' };
  }
}
