// Сверка продажба ↔ фактури.
//
// Фактурата е копие на продажбата в момента на издаването и после не се пипа
// (данъчен документ). Продажбата обаче може да се редактира и след това, затова
// разминаването се СМЯТА при всяко четене, а не се пази: активните обикновени
// и окончателни фактури (заедно с приспаднатите в тях аванси) трябва да
// покриват точно сумите на продажбата. Авансовите не се сверяват — те са за
// произволна част от сумата по дефиниция.

export interface DiffAmounts {
  subtotal: unknown;
  vatAmount: unknown;
  total: unknown;
}

export interface DiffInvoice extends DiffAmounts {
  type: string;
  status: string;
  advanceDeductions?: DiffAmounts[];
}

const COVERING_TYPES = new Set(['REGULAR', 'FINAL']);

/** Фактури, които се броят за покритие на продажбата */
export function isCoveringInvoice(inv: { type: string; status: string }): boolean {
  return inv.status !== 'CANCELLED' && COVERING_TYPES.has(inv.type);
}

/**
 * true = има поне една покриваща фактура и сумите им не съвпадат с продажбата.
 * Без активни покриващи фактури няма какво да се сверява (false).
 */
export function orderInvoicesDiffer(
  order: DiffAmounts,
  invoices: DiffInvoice[],
): boolean {
  const covering = invoices.filter(isCoveringInvoice);
  if (covering.length === 0) return false;

  let subtotal = 0;
  let vat = 0;
  let total = 0;
  for (const inv of covering) {
    subtotal += Number(inv.subtotal);
    vat += Number(inv.vatAmount);
    total += Number(inv.total);
    for (const d of inv.advanceDeductions ?? []) {
      subtotal += Number(d.subtotal);
      vat += Number(d.vatAmount);
      total += Number(d.total);
    }
  }

  // Общата сума е точна. Основа и ДДС минават през закръгляне на всеки
  // документ (пропорционално разпределение при аванс), затова там допускаме
  // по една стотинка на страна.
  return (
    Math.abs(total - Number(order.total)) > 0.011 ||
    Math.abs(subtotal - Number(order.subtotal)) > 0.021 ||
    Math.abs(vat - Number(order.vatAmount)) > 0.021
  );
}
