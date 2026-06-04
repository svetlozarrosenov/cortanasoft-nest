import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDescriptionDto, UpdateJobDescriptionDto } from './dto';

@Injectable()
export class JobDescriptionsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.jobDescription.create({
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
  }

  async update(companyId: string, id: string, dto: UpdateJobDescriptionDto) {
    await this.findOne(companyId, id);
    return this.prisma.jobDescription.update({
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
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.jobDescription.delete({ where: { id } });
    return { message: 'Длъжностната характеристика е изтрита успешно' };
  }
}
