import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, CreditApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import {
  CreateCreditApplicationDto,
  UpdateCreditApplicationDto,
  QueryCreditApplicationsDto,
} from './dto';

const CREDIT_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      total: true,
      status: true,
      currency: { select: { code: true } },
    },
  },
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      email: true,
      phone: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class CreditApplicationsService {
  constructor(
    private prisma: PrismaService,
    private webhookDispatcher: WebhookDispatcherService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateCreditApplicationDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      select: { id: true, customerId: true },
    });
    if (!order) {
      throw new NotFoundException('Поръчката не е намерена');
    }

    const existing = await this.prisma.creditApplication.findUnique({
      where: { orderId: dto.orderId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Тази поръчка вече има активна заявка за кредит',
      );
    }

    const created = await this.prisma.creditApplication.create({
      data: {
        orderId: dto.orderId,
        companyId,
        customerId: order.customerId,
        bank: dto.bank,
        bankRef: dto.bankRef,
        requestedAmount: dto.requestedAmount,
        termMonths: dto.termMonths,
        monthlyPayment: dto.monthlyPayment,
        appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : new Date(),
        notes: dto.notes,
        createdById: userId,
      },
      include: CREDIT_INCLUDE,
    });
    await this.webhookDispatcher.emitCreditChanged(companyId, created.id);
    return created;
  }

  async findAll(companyId: string, query: QueryCreditApplicationsDto) {
    const {
      status,
      bank,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.CreditApplicationWhereInput = {
      companyId,
      ...(status && { status }),
      ...(bank && { bank }),
      ...(dateFrom || dateTo
        ? {
            appliedAt: {
              ...(dateFrom && { gte: new Date(dateFrom + 'T00:00:00.000Z') }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
          { order: { customerName: { contains: search, mode: 'insensitive' } } },
          { bankRef: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.creditApplication.findMany({
        where,
        include: CREDIT_INCLUDE,
        orderBy: { appliedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditApplication.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const credit = await this.prisma.creditApplication.findFirst({
      where: { id, companyId },
      include: CREDIT_INCLUDE,
    });
    if (!credit) {
      throw new NotFoundException('Заявката за кредит не е намерена');
    }
    return credit;
  }

  async update(companyId: string, id: string, dto: UpdateCreditApplicationDto) {
    const existing = await this.findOne(companyId, id);

    // Когато status се промени, автоматично попълни съответния timestamp,
    // ако клиентът не го е изпратил изрично. Това поддържа audit trail-а
    // без да притеснява потребителя да гледа отделни полета.
    const statusChange =
      dto.status !== undefined && dto.status !== existing.status
        ? this.timestampsForStatus(dto.status)
        : {};

    const updated = await this.prisma.creditApplication.update({
      where: { id },
      data: {
        ...(dto.bank !== undefined && { bank: dto.bank }),
        ...(dto.bankRef !== undefined && { bankRef: dto.bankRef }),
        ...(dto.requestedAmount !== undefined && {
          requestedAmount: dto.requestedAmount,
        }),
        ...(dto.termMonths !== undefined && { termMonths: dto.termMonths }),
        ...(dto.monthlyPayment !== undefined && {
          monthlyPayment: dto.monthlyPayment,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.appliedAt && { appliedAt: new Date(dto.appliedAt) }),
        ...(dto.decisionAt && { decisionAt: new Date(dto.decisionAt) }),
        ...(dto.signedAt && { signedAt: new Date(dto.signedAt) }),
        ...(dto.paidAt && { paidAt: new Date(dto.paidAt) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...statusChange,
      },
      include: CREDIT_INCLUDE,
    });
    // Only emit when the status actually changed — bank/notes/amount
    // updates don't carry meaningful info for the shop.
    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.webhookDispatcher.emitCreditChanged(companyId, id);
    }
    return updated;
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.creditApplication.delete({ where: { id } });
    return { message: 'Заявката за кредит е изтрита' };
  }

  // Audit-trail timestamps: при движение към даден статус, ако такъв
  // timestamp още не е попълнен, използваме момента на промяната.
  private timestampsForStatus(status: CreditApplicationStatus) {
    const now = new Date();
    switch (status) {
      case 'APPROVED':
      case 'REJECTED':
        return { decisionAt: now };
      case 'SIGNED':
        return { signedAt: now };
      case 'PAID':
        return { paidAt: now };
      case 'CANCELLED':
        return { cancelledAt: now };
      default:
        return {};
    }
  }
}
