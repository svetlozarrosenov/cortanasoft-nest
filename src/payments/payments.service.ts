import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  QueryPaymentsDto,
} from './dto';

type PrismaTx = Prisma.TransactionClient;

const PAYMENT_INCLUDE = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  currency: { select: { id: true, code: true, symbol: true } },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query: QueryPaymentsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = { companyId };

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.dateFrom || query.dateTo) {
      where.paidAt = {};
      if (query.dateFrom) where.paidAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.paidAt.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: PAYMENT_INCLUDE,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, companyId },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(companyId: string, userId: string, dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: dto.orderId, companyId },
        select: { id: true, total: true, currencyId: true, paymentStatus: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      const payment = await tx.payment.create({
        data: {
          orderId: dto.orderId,
          companyId,
          amount: dto.amount,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          method: dto.method || 'CASH',
          reference: dto.reference,
          notes: dto.notes,
          currencyId: dto.currencyId || order.currencyId,
          exchangeRate: dto.exchangeRate ?? 1,
          createdById: userId,
        },
        include: PAYMENT_INCLUDE,
      });

      await this.recalculateOrderState(tx, dto.orderId);

      return payment;
    });
  }

  async update(companyId: string, id: string, dto: UpdatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, companyId },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      const updated = await tx.payment.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.paidAt && { paidAt: new Date(dto.paidAt) }),
          ...(dto.method && { method: dto.method }),
          ...(dto.reference !== undefined && { reference: dto.reference }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: PAYMENT_INCLUDE,
      });

      await this.recalculateOrderState(tx, payment.orderId);

      return updated;
    });
  }

  async remove(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, companyId },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      await tx.payment.delete({ where: { id } });
      await this.recalculateOrderState(tx, payment.orderId);

      return { success: true };
    });
  }

  /**
   * Derive order.paidAmount + paymentStatus from its payments.
   * Keeps REFUNDED as a manual override (not auto-derived).
   * Also syncs linked invoices (non-cancelled).
   */
  async recalculateOrderState(tx: PrismaTx, orderId: string) {
    const agg = await tx.payment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });

    const paid = Number(agg._sum.amount || 0);
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { total: true, paymentStatus: true, companyId: true },
    });
    if (!order) return;

    const total = Number(order.total);

    // REFUNDED is manual — don't override it
    let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' =
      order.paymentStatus === 'REFUNDED' ? 'REFUNDED' : 'PENDING';
    if (order.paymentStatus !== 'REFUNDED') {
      if (paid <= 0) newStatus = 'PENDING';
      else if (paid < total) newStatus = 'PARTIAL';
      else newStatus = 'PAID';
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        paidAmount: paid,
        paymentStatus: newStatus,
      },
    });

    // Sync linked invoices (non-cancelled): invoice.paidAmount = min(paid, invoice.total)
    const invoices = await tx.invoice.findMany({
      where: { orderId, status: { not: 'CANCELLED' } },
      select: { id: true, total: true, status: true },
    });

    for (const inv of invoices) {
      const invTotal = Number(inv.total);
      const invPaid = Math.min(paid, invTotal);
      let invStatus = inv.status;
      if (invStatus !== 'DRAFT') {
        if (invPaid >= invTotal) invStatus = 'PAID';
        else if (invPaid > 0) invStatus = 'PARTIALLY_PAID';
        else invStatus = 'ISSUED';
      }
      await tx.invoice.update({
        where: { id: inv.id },
        data: { paidAmount: invPaid, status: invStatus },
      });
    }
  }

  /**
   * Sync payments from a webhook-driven status change (WordPress/CloudCart).
   * PAID → ensure at least one synthetic payment covering the full total exists.
   * PENDING → delete synthetic/auto-generated payments (keep user-recorded ones).
   * PARTIAL → do nothing (amount unknown, let user record manually).
   */
  async syncPaymentsFromStatus(
    tx: PrismaTx,
    companyId: string,
    orderId: string,
    externalStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED',
    total: number,
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'COD' = 'CASH',
  ) {
    if (externalStatus === 'PAID') {
      const existing = await tx.payment.aggregate({
        where: { orderId },
        _sum: { amount: true },
      });
      const paid = Number(existing._sum.amount || 0);
      if (paid < total) {
        await tx.payment.create({
          data: {
            orderId,
            companyId,
            amount: total - paid,
            method,
            notes: 'Автоматично от външна интеграция',
          },
        });
      }
    } else if (externalStatus === 'PENDING') {
      // Remove only integration-auto-generated payments, preserve user-recorded
      await tx.payment.deleteMany({
        where: {
          orderId,
          createdById: null,
          notes: { contains: 'Автоматично' },
        },
      });
    }
    // PARTIAL/REFUNDED: no auto-action
    await this.recalculateOrderState(tx, orderId);
  }
}
