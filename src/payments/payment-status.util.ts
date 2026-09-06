import { Prisma } from '@prisma/client';

export type DerivedPaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';

const EPS = 0.005;

/**
 * Платежният статус е ИЗЧИСЛЕН — никога не се въвежда на ръка.
 * Единственият вход са плащанията: положителни (получени пари) и
 * отрицателни (върнати пари). REFUNDED = имало е връщане и нетно
 * нищо не е останало платено.
 */
export function derivePaymentStatus(
  paid: number,
  total: number,
  hasRefund: boolean,
): DerivedPaymentStatus {
  if (paid <= EPS) return hasRefund ? 'REFUNDED' : 'PENDING';
  if (paid < total - EPS) return 'PARTIAL';
  return 'PAID';
}

/**
 * Нетно платено + дали има поне едно връщане по документа.
 */
export async function sumPayments(
  tx: Prisma.TransactionClient,
  where: Prisma.PaymentWhereInput,
): Promise<{ paid: number; hasRefund: boolean }> {
  const [agg, refunds] = await Promise.all([
    tx.payment.aggregate({ where, _sum: { amount: true } }),
    tx.payment.count({ where: { ...where, amount: { lt: 0 } } }),
  ]);
  return {
    paid: Math.round(Number(agg._sum.amount || 0) * 100) / 100,
    hasRefund: refunds > 0,
  };
}
