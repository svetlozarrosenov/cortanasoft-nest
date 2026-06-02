import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import {
  CreateEmploymentContractDto,
  UpdateEmploymentContractDto,
} from './dto';

@Injectable()
export class EmploymentContractsService {
  constructor(
    private prisma: PrismaService,
    private numbering: EmployeeRecordNumberingService,
  ) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    annexes: { orderBy: { effectiveDate: 'desc' as const } },
    termination: true,
    _count: { select: { files: true, annexes: true } },
  };

  async findAll(companyId: string, userId?: string) {
    const data = await this.prisma.employmentContract.findMany({
      where: { companyId, ...(userId ? { userId } : {}) },
      include: this.include,
      orderBy: { startDate: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const contract = await this.prisma.employmentContract.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!contract) {
      throw new NotFoundException('Трудовият договор не е намерен');
    }
    return contract;
  }

  async create(
    companyId: string,
    userId: string,
    dto: CreateEmploymentContractDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const number =
        dto.number || (await this.numbering.next('contract', companyId, tx));
      return tx.employmentContract.create({
        data: {
          number,
          type: dto.type ?? 'INDEFINITE',
          status: dto.status ?? 'ACTIVE',
          position: dto.position ?? null,
          nkpdCode: dto.nkpdCode ?? null,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          salary: dto.salary ?? null,
          workingHours: dto.workingHours ?? null,
          probationMonths: dto.probationMonths ?? null,
          notes: dto.notes ?? null,
          userId: dto.userId,
          createdById: userId,
          companyId,
        },
        include: this.include,
      });
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmploymentContractDto,
  ) {
    await this.findOne(companyId, id);
    return this.prisma.employmentContract.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.nkpdCode !== undefined ? { nkpdCode: dto.nkpdCode } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: new Date(dto.startDate) }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.salary !== undefined ? { salary: dto.salary } : {}),
        ...(dto.workingHours !== undefined
          ? { workingHours: dto.workingHours }
          : {}),
        ...(dto.probationMonths !== undefined
          ? { probationMonths: dto.probationMonths }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: this.include,
    });
  }

  /** Уведомяване на служителя (наредба) — записва момента. */
  async markNotified(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.employmentContract.update({
      where: { id },
      data: { notifiedEmployeeAt: new Date() },
      include: this.include,
    });
  }

  /** Потвърждаване на получаване (наредба). */
  async confirmDelivery(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.employmentContract.update({
      where: { id },
      data: { deliveryConfirmedAt: new Date() },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.employmentContract.delete({ where: { id } });
    return { message: 'Трудовият договор е изтрит успешно' };
  }
}
