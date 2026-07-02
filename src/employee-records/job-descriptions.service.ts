import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
import { CreateJobDescriptionDto, UpdateJobDescriptionDto } from './dto';

@Injectable()
export class JobDescriptionsService {
  constructor(
    private prisma: PrismaService,
    private audit: EmployeeRecordAuditService,
  ) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    _count: { select: { files: true } },
  };

  async findAll(companyId: string, position?: string) {
    const data = await this.prisma.jobDescription.findMany({
      where: { companyId, ...(position ? { position } : {}) },
      include: this.include,
      orderBy: [{ position: 'asc' }, { version: 'desc' }],
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const jd = await this.prisma.jobDescription.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!jd) throw new NotFoundException('Длъжностната характеристика не е намерена');
    return jd;
  }

  async create(companyId: string, userId: string, dto: CreateJobDescriptionDto) {
    // Авто-версиониране: следваща версия за същата длъжност (компания-ниво)
    const last = await this.prisma.jobDescription.findFirst({
      where: { companyId, position: dto.position },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    const jd = await this.prisma.jobDescription.create({
      data: {
        position: dto.position,
        version,
        responsibilities: dto.responsibilities ?? null,
        requirements: dto.requirements ?? null,
        createdById: userId,
        companyId,
      },
      include: this.include,
    });

    await this.audit.log(companyId, {
      action: 'CREATE',
      actorId: userId,
      targetUserId: null,
      entityType: 'jobDescription',
      entityId: jd.id,
      detail: `Длъжностна характеристика ${jd.position} v${jd.version}`,
    });

    return jd;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateJobDescriptionDto,
    actorId?: string,
  ) {
    const existing = await this.findOne(companyId, id);
    const updated = await this.prisma.jobDescription.update({
      where: { id },
      data: {
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.responsibilities !== undefined
          ? { responsibilities: dto.responsibilities }
          : {}),
        ...(dto.requirements !== undefined
          ? { requirements: dto.requirements }
          : {}),
      },
      include: this.include,
    });

    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actorId ?? null,
      targetUserId: null,
      entityType: 'jobDescription',
      entityId: id,
      detail: `Длъжностна характеристика ${existing.position} v${existing.version}`,
    });

    return updated;
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const existing = await this.findOne(companyId, id);
    await this.prisma.jobDescription.delete({ where: { id } });
    await this.audit.log(companyId, {
      action: 'DELETE',
      actorId: actorId ?? null,
      targetUserId: null,
      entityType: 'jobDescription',
      entityId: id,
      detail: `Длъжностна характеристика ${existing.position} v${existing.version}`,
    });
    return { message: 'Длъжностната характеристика е изтрита успешно' };
  }
}
