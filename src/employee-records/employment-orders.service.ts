import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeRecordNumberingService } from './employee-record-numbering.service';
import { EmployeeRecordAuditService } from './employee-record-audit.service';
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
    private audit: EmployeeRecordAuditService,
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
    const order = await this.prisma.$transaction(async (tx) => {
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

    await this.audit.log(companyId, {
      action: 'CREATE',
      actorId: userId,
      targetUserId: dto.userId,
      entityType: 'employmentOrder',
      entityId: order.id,
      detail: `Заповед ${order.number}`,
    });

    return order;
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
    const result = await this.prisma.$transaction(async (tx) => {
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

    for (const order of result.data) {
      await this.audit.log(companyId, {
        action: 'CREATE',
        actorId: userId,
        targetUserId: order.userId,
        entityType: 'employmentOrder',
        entityId: order.id,
        detail: `Заповед ${order.number}`,
      });
    }

    return result;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEmploymentOrderDto,
    actorId?: string,
  ) {
    const existing = await this.findOne(companyId, id);
    const updated = await this.prisma.employmentOrder.update({
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

    await this.audit.log(companyId, {
      action: 'UPDATE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employmentOrder',
      entityId: id,
      detail: `Заповед ${existing.number}`,
    });

    return updated;
  }

  async remove(companyId: string, id: string, actorId?: string) {
    const existing = await this.findOne(companyId, id);
    await this.prisma.employmentOrder.delete({ where: { id } });
    await this.audit.log(companyId, {
      action: 'DELETE',
      actorId: actorId ?? null,
      targetUserId: existing.userId,
      entityType: 'employmentOrder',
      entityId: id,
      detail: `Заповед ${existing.number}`,
    });
    return { message: 'Заповедта е изтрита успешно' };
  }
}
