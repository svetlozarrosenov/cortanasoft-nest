/**
 * Сверка на основа / ДДС / общо след AI разчитане на документ за разход.
 *
 * Българските фискални бонове с фактура (бензиностанции, магазини) печатат
 * единичната цена и „Сума" на реда С ВКЛЮЧЕНО ДДС, а отдолу „в т.ч. ДДС" и
 * „нето стойност". Моделът често взима „Сума" за данъчна основа и начислява
 * 20% отгоре. Тук платеното (общото) е котвата: то е единственото число,
 * което операторът лесно проверява срещу бона.
 */
export interface InvoiceAmounts {
  totalAmount?: number | null;
  vatAmount?: number | null;
  subtotal?: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 0.02;
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/**
 * @param amounts  сумите, както моделът ги е върнал
 */
export function reconcileInvoiceAmounts(amounts: InvoiceAmounts): {
  totalAmount?: number;
  vatAmount?: number;
  subtotal?: number;
} {
  const total = isNum(amounts.totalAmount) ? amounts.totalAmount : null;
  const vat = isNum(amounts.vatAmount) ? amounts.vatAmount : null;
  const sub = isNum(amounts.subtotal) ? amounts.subtotal : null;

  const out = (t?: number | null, v?: number | null, s?: number | null) => ({
    ...(isNum(t) && { totalAmount: round2(t) }),
    ...(isNum(v) && { vatAmount: round2(v) }),
    ...(isNum(s) && { subtotal: round2(s) }),
  });

  // Всичко е налице и се сумира → нищо за правене
  if (
    total != null &&
    vat != null &&
    sub != null &&
    Math.abs(sub + vat - total) <= EPS
  ) {
    return out(total, vat, sub);
  }
  // Общо и ДДС са налице → основата е разликата (моделът е объркал „Сума"
  // с основа, или изобщо не е дал основа)
  if (total != null && vat != null && total - vat > 0) {
    return out(total, vat, total - vat);
  }
  // Основа и ДДС без общо → общото е сборът
  if (total == null && sub != null && vat != null) {
    return out(sub + vat, vat, sub);
  }
  // Общо без ДДС: ако има по-малка основа, ДДС е разликата; иначе документът
  // НЕ показва ДДС → не измисляме такова (чуждестранни, нерегистрирани, 0%).
  // Фискалните бонове винаги печатат „в т.ч. ДДС", така че моделът го чете.
  if (total != null && vat == null) {
    if (sub != null && sub < total - EPS) {
      return out(total, total - sub, sub);
    }
    return out(total, 0, total);
  }
  // Само основа (общо неизвестно) → приемаме, че е и общото, без ДДС
  if (total == null && sub != null && vat == null) {
    return out(sub, 0, sub);
  }
  return out(total, vat, sub);
}

/** Една обща ставка от редовете, ако всички я показват еднаква; иначе null */
export function uniformLineRate(
  lines: { vatRate?: number | null }[],
): number | null {
  const rates = lines
    .map((l) => l.vatRate)
    .filter((r): r is number => typeof r === 'number');
  if (rates.length === 0) return null;
  return rates.every((r) => r === rates[0]) ? rates[0] : null;
}

export interface ScannedLine {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Редовете трябва да се сумират до основата (тя е сверена с платеното).
 * Разминаване над толеранса (отстъпка на бона, бруто цени на реда…) се
 * разпределя пропорционално по редовете; ед. цената пази 4 знака.
 */
export function scaleLinesToSubtotal<T extends ScannedLine>(
  lines: T[],
  subtotal?: number | null,
): T[] {
  if (!isNum(subtotal) || subtotal <= 0 || lines.length === 0) return lines;
  const sum = lines.reduce(
    (a, l) => a + (isNum(l.totalPrice) ? l.totalPrice : 0),
    0,
  );
  if (sum <= 0 || Math.abs(sum - subtotal) <= 0.05) return lines;
  const k = subtotal / sum;
  const scaled = lines.map((l) => {
    const totalPrice = round2(l.totalPrice * k);
    const qty = isNum(l.quantity) && l.quantity > 0 ? l.quantity : 1;
    return {
      ...l,
      totalPrice,
      unitPrice: Math.round((totalPrice / qty) * 10000) / 10000,
    };
  });
  // Остатък от закръгляне → в последния ред
  const diff = round2(subtotal - scaled.reduce((a, l) => a + l.totalPrice, 0));
  if (diff !== 0) {
    const last = scaled[scaled.length - 1];
    last.totalPrice = round2(last.totalPrice + diff);
    const qty = isNum(last.quantity) && last.quantity > 0 ? last.quantity : 1;
    last.unitPrice = Math.round((last.totalPrice / qty) * 10000) / 10000;
  }
  return scaled;
}
