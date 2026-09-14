import { Prisma, PrismaClient } from '@prisma/client';
import {
  derivePaymentStatus,
  sumPayments,
} from '../payments/payment-status.util';

type Client = Prisma.TransactionClient | PrismaClient;

// Standard include for goods receipt queries
export const RECEIPT_INCLUDE = {
  location: true,
  supplier: true,
  currency: true,
  // Продажбата при директна доставка (drop-ship)
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      status: true,
      shippingAddress: true,
      shippingCity: true,
      shippingPostalCode: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  items: {
    include: {
      product: true,
      currency: true,
    },
  },
  expenses: {
    include: {
      supplier: true,
      currency: true,
    },
  },
  payments: {
    include: {
      currency: { select: { id: true, code: true, symbol: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { paidAt: 'desc' as const },
  },
  _count: { select: { items: true } },
};


/** Следващ номер GR-YYYY-NNNNN за компанията (викай вътре в транзакция). */
export async function generateReceiptNumber(
  client: Client,
  companyId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GR-${year}-`;

  const lastReceipt = await client.goodsReceipt.findFirst({
    where: { companyId, receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastReceipt) {
    const lastNumber = parseInt(
      lastReceipt.receiptNumber.split('-').pop() || '0',
    );
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Преизчислява totalAmount (редове + разходи, във валутата на компанията) и
 * извежда paidAmount/paymentStatus от плащанията. Самодостатъчна, за да
 * върви вътре в транзакциите на create/update.
 */
export async function recalcReceiptState(
  tx: Prisma.TransactionClient,
  receiptId: string,
): Promise<void> {
  const items = await tx.goodsReceiptItem.findMany({
    where: { goodsReceiptId: receiptId },
    select: { quantity: true, unitPrice: true, exchangeRate: true, vatRate: true },
  });
  const itemsTotal = items.reduce((sum, it) => {
    const base =
      Number(it.quantity) * Number(it.unitPrice) * Number(it.exchangeRate);
    return sum + base + base * (Number(it.vatRate) / 100);
  }, 0);
  const expAgg = await tx.expense.aggregate({
    where: { goodsReceiptId: receiptId },
    _sum: { totalAmount: true },
  });
  const total =
    Math.round((itemsTotal + Number(expAgg._sum.totalAmount || 0)) * 100) / 100;

  const { paid, hasRefund } = await sumPayments(tx, { goodsReceiptId: receiptId });
  const paymentStatus = derivePaymentStatus(paid, total, hasRefund);

  await tx.goodsReceipt.update({
    where: { id: receiptId },
    data: { totalAmount: total, paidAmount: paid, paymentStatus },
  });
}
