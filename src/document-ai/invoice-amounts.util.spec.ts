import {
  reconcileInvoiceAmounts,
  uniformLineRate,
  scaleLinesToSubtotal,
  ScannedLine,
} from './invoice-amounts.util';

describe('reconcileInvoiceAmounts', () => {
  it('leaves consistent amounts alone', () => {
    expect(
      reconcileInvoiceAmounts({
        totalAmount: 68.27,
        vatAmount: 11.38,
        subtotal: 56.89,
      }),
    ).toEqual({
      totalAmount: 68.27,
      vatAmount: 11.38,
      subtotal: 56.89,
    });
  });

  it('fuel receipt: gross line sum mistaken for the base → base = total − VAT', () => {
    // Shell: „Сума 68.27", „в т.ч. ДДС 11.38" — моделът е дал основа 68.27
    expect(
      reconcileInvoiceAmounts({
        totalAmount: 68.27,
        vatAmount: 11.38,
        subtotal: 68.27,
      }),
    ).toEqual({
      totalAmount: 68.27,
      vatAmount: 11.38,
      subtotal: 56.89,
    });
  });

  it('total + VAT without subtotal → subtotal derived', () => {
    expect(
      reconcileInvoiceAmounts({
        totalAmount: 86,
        vatAmount: 14.33,
        subtotal: null,
      }),
    ).toEqual({
      totalAmount: 86,
      vatAmount: 14.33,
      subtotal: 71.67,
    });
  });

  it('only a total, no VAT shown → no VAT is invented (handwritten / foreign / 0%)', () => {
    expect(reconcileInvoiceAmounts({ totalAmount: 260 })).toEqual({
      totalAmount: 260,
      vatAmount: 0,
      subtotal: 260,
    });
    expect(
      reconcileInvoiceAmounts({ totalAmount: 260, subtotal: 260 }),
    ).toEqual({
      totalAmount: 260,
      vatAmount: 0,
      subtotal: 260,
    });
  });

  it('total + smaller subtotal, VAT missing → VAT is the difference', () => {
    expect(
      reconcileInvoiceAmounts({ totalAmount: 81, subtotal: 67.5 }),
    ).toEqual({
      totalAmount: 81,
      vatAmount: 13.5,
      subtotal: 67.5,
    });
  });

  it('subtotal + VAT without total → total is the sum', () => {
    expect(reconcileInvoiceAmounts({ subtotal: 100, vatAmount: 20 })).toEqual({
      totalAmount: 120,
      vatAmount: 20,
      subtotal: 100,
    });
  });

  it('only a subtotal → it is also the total, no VAT', () => {
    expect(reconcileInvoiceAmounts({ subtotal: 45.36 })).toEqual({
      totalAmount: 45.36,
      vatAmount: 0,
      subtotal: 45.36,
    });
  });

  it('nothing known → nothing invented', () => {
    expect(reconcileInvoiceAmounts({})).toEqual({});
  });
});

describe('uniformLineRate', () => {
  it('returns the shared rate, null when mixed or unknown', () => {
    expect(uniformLineRate([{ vatRate: 20 }, { vatRate: 20 }])).toBe(20);
    expect(uniformLineRate([{ vatRate: 20 }, { vatRate: 9 }])).toBeNull();
    expect(uniformLineRate([{}, { vatRate: null }])).toBeNull();
    expect(uniformLineRate([{ vatRate: 0 }])).toBe(0);
  });
});

describe('scaleLinesToSubtotal', () => {
  it('leaves lines alone when they already sum to the subtotal', () => {
    const lines = [
      { quantity: 2, unitPrice: 10, totalPrice: 20 },
      { quantity: 1, unitPrice: 5.5, totalPrice: 5.5 },
    ];
    expect(scaleLinesToSubtotal(lines, 25.5)).toEqual(lines);
    expect(scaleLinesToSubtotal(lines, 25.53)).toEqual(lines);
  });

  it('fuel receipt with a discount: single line is brought down to the base', () => {
    // Лукойл: ред 28.71 × 1.6333 = 46.90, основа след отстъпка 45.93
    const [l] = scaleLinesToSubtotal(
      [{ quantity: 28.71, unitPrice: 1.6333, totalPrice: 46.9 }],
      45.93,
    );
    expect(l.totalPrice).toBe(45.93);
    expect(l.unitPrice).toBeCloseTo(1.5998, 4);
  });

  it('several lines scale proportionally and sum exactly to the base', () => {
    const out = scaleLinesToSubtotal(
      [
        { quantity: 1, unitPrice: 60, totalPrice: 60 },
        { quantity: 1, unitPrice: 40, totalPrice: 40 },
      ],
      90,
    );
    expect(out.map((l: ScannedLine) => l.totalPrice)).toEqual([54, 36]);
    expect(out.reduce((a: number, l: ScannedLine) => a + l.totalPrice, 0)).toBe(
      90,
    );
  });

  it('no subtotal or empty lines → unchanged', () => {
    const lines = [{ quantity: 1, unitPrice: 1, totalPrice: 1 }];
    expect(scaleLinesToSubtotal(lines, null)).toBe(lines);
    expect(scaleLinesToSubtotal([], 10)).toEqual([]);
  });
});
