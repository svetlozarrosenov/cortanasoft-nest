import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import {
  BroadcastEmploymentOrderDto,
  CreateEmploymentOrderDto,
  UpdateEmploymentOrderDto,
} from './dto';

@Injectable()
export class EmploymentOrdersService {
  constructor(
    private prisma: PrismaService,
    private numbering: EmployeeRecordNumberingService,
  ) {}

  private readonly include = {
    files: { orderBy: { createdAt: 'desc' as const } },
    _count: { select: { files: true } },
  };

  async findAll(companyId: string, userId?: string) {
    const data = await this.prisma.employmentOrder.findMany({
      where: { companyId, ...(userId ? { userId } : {}) },
      include: this.include,
      orderBy: { date: 'desc' },
    });
    return { data, meta: { total: data.length } };
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.employmentOrder.findFirst({
      where: { id, companyId },
      include: this.include,
    });
    if (!order) throw new NotFoundException('Заповедта не е намерена');
    return order;
  }

  async create(companyId: string, userId: string, dto: CreateEmploymentOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const number =
        dto.number || (await this.numbering.next('order', companyId, tx));
      return tx.employmentOrder.create({
        data: {
          number,
          type: dto.type ?? 'OTHER',
          date: new Date(dto.date),
          subject: dto.subject,
          content: dto.content ?? null,
          userId: dto.userId,
          createdById: userId,
          companyId,
        },
        include: this.include,
      });
    });
  }

  /**
   * Издаване на една заповед към много служители (пиши веднъж → fan-out).
   * Създава по една заповед (със собствен номер) в досието на всеки получател,
   * така че per-служител notify/confirm и прикачени файлове работят както обикновено.
   */
  async createBroadcast(
    companyId: string,
    userId: string,
    dto: BroadcastEmploymentOrderDto,
  ) {
    const userIds = [...new Set(dto.userIds)].filter(Boolean);
    if (userIds.length === 0) {
      throw new BadRequestException('Няма избрани получатели');
    }
    return this.prisma.$transaction(async (tx) => {
      const created: { id: string; number: string; userId: string }[] = [];
      for (const uid of userIds) {
        const number = await this.numbering.next('order', companyId, tx);
        const order = await tx.employmentOrder.create({
          data: {
            number,
            type: dto.type ?? 'OTHER',
            date: new Date(dto.date),
            subject: dto.subject,
            content: dto.content ?? null,
            userId: uid,
            createdById: userId,
            companyId,
          },
          select: { id: true, number: true, userId: true },
        });
        created.push(order);
      }
      return { count: created.length, data: created };
    });
  }

  async update(companyId: string, id: string, dto: UpdateEmploymentOrderDto) {
    await this.findOne(companyId, id);
    return this.prisma.employmentOrder.update({
      where: { id },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
      include: this.include,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.employmentOrder.delete({ where: { id } });
    return { message: 'Заповедта е изтрита успешно' };
  }
}
