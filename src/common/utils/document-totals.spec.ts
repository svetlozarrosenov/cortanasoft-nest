import { BadRequestException } from '@nestjs/common';
import { calculateDocumentTotals } from './document-totals';

describe('calculateDocumentTotals — отстъпка на документа преди ДДС', () => {
  it('сума: ДДС е върху остатъка', () => {
    const r = calculateDocumentTotals([{ subtotal: 100, vatRate: 20 }], 100, {
      discount: 10,
    });
    expect(r).toEqual({
      discount: 10,
      discountPercent: null,
      vatAmount: 18,
      total: 108,
    });
  });

  it('процент: сумата се изчислява, подадената сума се игнорира', () => {
    const r = calculateDocumentTotals([{ subtotal: 100, vatRate: 20 }], 100, {
      discount: 999,
      discountPercent: 15,
    });
    expect(r).toEqual({
      discount: 15,
      discountPercent: 15,
      vatAmount: 17,
      total: 102,
    });
  });

  it('разпределя се по редовете според ставката им', () => {
    const r = calculateDocumentTotals(
      [
        { subtotal: 100, vatRate: 20 },
        { subtotal: 100, vatRate: 0 },
      ],
      200,
      { discount: 50 },
    );
    expect(r.vatAmount).toBe(15); // (100 − 25) × 20%
    expect(r.total).toBe(165);
  });

  it('остатъкът от закръглянето е на последния ред', () => {
    const r = calculateDocumentTotals(
      [
        { subtotal: 33.33, vatRate: 20 },
        { subtotal: 33.33, vatRate: 20 },
        { subtotal: 33.34, vatRate: 20 },
      ],
      100,
      { discount: 10 },
    );
    expect(r.vatAmount).toBe(18);
    expect(r.total).toBe(108);
  });

  it('доставката се добавя след ДДС и не участва в отстъпката', () => {
    const r = calculateDocumentTotals(
      [{ subtotal: 100, vatRate: 20 }],
      100,
      { discountPercent: 10 },
      5,
    );
    expect(r.total).toBe(113);
  });

  it('без отстъпка и без редове', () => {
    expect(calculateDocumentTotals([], 0, {})).toEqual({
      discount: 0,
      discountPercent: null,
      vatAmount: 0,
      total: 0,
    });
  });

  it('отстъпка над стойността на редовете е грешка', () => {
    expect(() =>
      calculateDocumentTotals([{ subtotal: 100, vatRate: 20 }], 100, {
        discount: 150,
      }),
    ).toThrow(BadRequestException);
  });
});
