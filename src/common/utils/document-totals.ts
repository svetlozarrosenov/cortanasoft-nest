import { BadRequestException } from '@nestjs/common';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DocumentLine {
  /** Стойност на реда след отстъпката на реда, без ДДС */
  subtotal: number;
  vatRate: number;
}

export interface DocumentDiscountInput {
  /** Отстъпка на документа като сума (преди ДДС) */
  discount?: number | null;
  /** Отстъпка на документа в % — има предимство пред сумата */
  discountPercent?: number | null;
}

/**
 * Суми на документ (продажба, оферта) с отстъпка на документа ПРЕДИ ДДС.
 *
 * Търговската отстъпка не влиза в данъчната основа: разпределя се
 * пропорционално по редовете и ДДС се смята върху остатъка на всеки ред,
 * по неговата ставка. Последният ред поема остатъка от закръглянето, за да
 * се сумира точно. При зададен процент сумата се изчислява тук, а
 * подадената сума се игнорира.
 */
export function calculateDocumentTotals(
  lines: DocumentLine[],
  subtotal: number,
  discountInput: DocumentDiscountInput,
  shippingCost = 0,
) {
  const discountPercent =
    discountInput.discountPercent != null
      ? discountInput.discountPercent
      : null;
  const discount =
    discountPercent != null
      ? round2((subtotal * discountPercent) / 100)
      : round2(discountInput.discount ?? 0);

  if (discount > subtotal) {
    throw new BadRequestException(
      'Отстъпката на документа не може да надвишава стойността на редовете',
    );
  }

  let allocated = 0;
  let vatAmount = 0;
  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    const share = isLast
      ? round2(discount - allocated)
      : subtotal > 0
        ? round2((discount * line.subtotal) / subtotal)
        : 0;
    allocated += share;
    const taxable = line.subtotal - share;
    vatAmount += round2(taxable * (line.vatRate / 100));
  });
  vatAmount = round2(vatAmount);

  return {
    discount,
    discountPercent,
    vatAmount,
    total: round2(subtotal - discount + vatAmount + shippingCost),
  };
}
