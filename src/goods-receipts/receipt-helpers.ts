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
      items: { orderBy: { sortOrder: 'asc' as const } },
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface UnitCostItem {
  id: string;
  quantity: Prisma.Decimal | number;
  unitPrice: Prisma.Decimal | number;
  exchangeRate: Prisma.Decimal | number | null;
  product?: { type: string } | null;
}
/** Ред на разход към доставката (ExpenseItem): нетна сума × курс = фирмена валута */
export interface UnitCostExpense {
  amount: Prisma.Decimal | number;
  exchangeRate?: Prisma.Decimal | number | null;
  includeInStockCost: boolean;
  /** VALUE (по подразбиране) или QUANTITY */
  stockCostAllocation?: string | null;
}

/** Всички редове от всички разходи на доставката — това влиза в computeUnitCosts */
export function landedCostLines(
  expenses: { items?: UnitCostExpense[] | null }[],
): UnitCostExpense[] {
  return expenses.flatMap((e) => e.items ?? []);
}

/**
 * Себестойност на единица за всеки ред от доставката, ВЪВ ВАЛУТАТА НА
 * КОМПАНИЯТА:
 *   база на реда   = количество × покупна цена × курс на реда
 *   landed cost    = Σ разходи към доставката с includeInStockCost, всеки
 *                    със свой метод: VALUE — дял ∝ база на реда (при нулева
 *                    обща база — по количество); QUANTITY — дял ∝ количество
 *   unitCost       = (база + дял) / количество, закръглено до стотинка
 * Услугите не влизат в склада и не поемат дял от разходите.
 */
export function computeUnitCosts(
  items: UnitCostItem[],
  expenses: UnitCostExpense[],
): Map<string, number> {
  let landedByValue = 0;
  let landedByQty = 0;
  for (const e of expenses) {
    if (!e.includeInStockCost) continue;
    const net = Number(e.amount) * Number(e.exchangeRate || 1);
    if (e.stockCostAllocation === 'QUANTITY') landedByQty += net;
    else landedByValue += net;
  }
  const base = (it: UnitCostItem) =>
    Number(it.quantity) * Number(it.unitPrice) * Number(it.exchangeRate || 1);
  const stockItems = items.filter((it) => it.product?.type !== 'SERVICE');
  const totalBase = stockItems.reduce((s, it) => s + base(it), 0);
  const totalQty = stockItems.reduce((s, it) => s + Number(it.quantity), 0);
  // Разход „по стойност" при безплатна стока няма база → пада по количество
  if (totalBase <= 0) {
    landedByQty += landedByValue;
    landedByValue = 0;
  }

  const out = new Map<string, number>();
  for (const it of items) {
    const qty = Number(it.quantity);
    const lineBase = base(it);
    let share = 0;
    if (it.product?.type !== 'SERVICE') {
      if (landedByValue > 0 && totalBase > 0) {
        share += (landedByValue * lineBase) / totalBase;
      }
      if (landedByQty > 0 && totalQty > 0) {
        share += (landedByQty * qty) / totalQty;
      }
    }
    out.set(it.id, qty > 0 ? round2((lineBase + share) / qty) : 0);
  }
  return out;
}

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
 * Статусът на разходния документ на доставката се води от доставката
 * (както при фактура от доставчик в големите ERP — получаването на стоката е
 * потвърждението, плащането затваря):
 *   доставка анулирана          → CANCELLED
 *   доставката е изцяло платена → PAID (paidAt = последното плащане)
 *   доставката е доставена      → APPROVED
 *   очаквана                    → PENDING остава; ръчно APPROVED се пази;
 *                                  върнато плащане сваля PAID → PENDING
 */
export async function syncReceiptExpenses(
  tx: Prisma.TransactionClient,
  receiptId: string,
): Promise<void> {
  const receipt = await tx.goodsReceipt.findUnique({
    where: { id: receiptId },
    select: { status: true, paymentStatus: true },
  });
  if (!receipt) return;
  const where = { goodsReceiptId: receiptId };
  if (receipt.status === 'CANCELLED') {
    await tx.expense.updateMany({ where, data: { status: 'CANCELLED' } });
    return;
  }
  // Начинът на плащане идва от последното плащане по доставката (и при
  // частично платена — за банковото съгласуване)
  const last = await tx.payment.findFirst({
    where: { goodsReceiptId: receiptId },
    orderBy: { paidAt: 'desc' },
    select: { paidAt: true, method: true },
  });
  if (last?.method) {
    await tx.expense.updateMany({
      where,
      data: { paymentMethod: last.method },
    });
  }
  if (receipt.paymentStatus === 'PAID') {
    await tx.expense.updateMany({
      where: { ...where, status: { not: 'CANCELLED' } },
      data: { status: 'PAID', paidAt: last?.paidAt ?? new Date() },
    });
    return;
  }
  if (receipt.status === 'DELIVERED') {
    await tx.expense.updateMany({
      where: { ...where, status: { in: ['PENDING', 'PAID'] } },
      data: { status: 'APPROVED', paidAt: null },
    });
    return;
  }
  // Очаквана: само връщаме „платен" назад, ако плащането е било върнато
  await tx.expense.updateMany({
    where: { ...where, status: 'PAID' },
    data: { status: 'PENDING', paidAt: null },
  });
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
    select: {
      quantity: true,
      unitPrice: true,
      exchangeRate: true,
      vatRate: true,
    },
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

  const { paid, hasRefund } = await sumPayments(tx, {
    goodsReceiptId: receiptId,
  });
  const paymentStatus = derivePaymentStatus(paid, total, hasRefund);

  await tx.goodsReceipt.update({
    where: { id: receiptId },
    data: { totalAmount: total, paidAmount: paid, paymentStatus },
  });
  await syncReceiptExpenses(tx, receiptId);
}
