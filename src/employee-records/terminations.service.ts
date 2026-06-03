import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTerminationDto, UpdateTerminationDto } from './dto';

@Injectable()
export class TerminationsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    contract: { select: { id: true, number: true } },
    _count: { select: { files: true } },
  };

  async findAll(companyId: string, userId?: string) {
    const data = await this.prisma.termination.findMany({
      where: { companyId, ...(userId ? { userId } : {}) },
      include: this.include,
      orderBy: { date: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const term = await this.prisma.termination.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!term) throw new NotFoundException('Прекратяването не е намерено');
    return term;
  }

  async create(companyId: string, userId: string, dto: CreateTerminationDto) {
    if (dto.contractId) {
      const contract = await this.prisma.employmentContract.findFirst({
        where: { id: dto.contractId, companyId },
        select: { id: true, termination: { select: { id: true } } },
      });
      if (!contract) throw new NotFoundException('Трудовият договор не е намерен');
      if (contract.termination) {
        throw new BadRequestException('Договорът вече е прекратен');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const term = await tx.termination.create({
        data: {
          basis: dto.basis,
          date: new Date(dto.date),
          noticeServedAt: dto.noticeServedAt
            ? new Date(dto.noticeServedAt)
            : null,
          compensation: dto.compensation ?? null,
          notes: dto.notes ?? null,
          userId: dto.userId,
          createdById: userId,
          contractId: dto.contractId ?? null,
          companyId,
        },
        include: this.include,
      });
      // Прекратеният договор → статус TERMINATED
      if (dto.contractId) {
        await tx.employmentContract.update({
          where: { id: dto.contractId },
          data: { status: 'TERMINATED' },
        });
      }
      return term;
    });
  }

  async update(companyId: string, id: string, dto: UpdateTerminationDto) {
    await this.findOne(companyId, id);
    return this.prisma.termination.update({
      where: { id },
      data: {
        ...(dto.basis !== undefined ? { basis: dto.basis } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.noticeServedAt !== undefined
          ? {
              noticeServedAt: dto.noticeServedAt
                ? new Date(dto.noticeServedAt)
                : null,
            }
          : {}),
        ...(dto.compensation !== undefined
          ? { compensation: dto.compensation }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    const term = await this.findOne(companyId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.termination.delete({ where: { id } });
      // Връщаме договора към AMENDED (вече не е прекратен)
      if (term.contractId) {
        await tx.employmentContract.updateMany({
          where: { id: term.contractId, status: 'TERMINATED' },
          data: { status: 'AMENDED' },
        });
      }
      return { message: 'Прекратяването е изтрито успешно' };
    });
  }
}
