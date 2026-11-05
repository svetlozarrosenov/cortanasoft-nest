import { orderInvoicesDiffer } from './invoice-order-diff';

const order = { subtotal: 100, vatAmount: 20, total: 120 };
const regular = (over: Partial<Record<string, unknown>> = {}) => ({
  type: 'REGULAR',
  status: 'ISSUED',
  subtotal: 100,
  vatAmount: 20,
  total: 120,
  ...over,
});

describe('orderInvoicesDiffer', () => {
  it('няма активни покриващи фактури → няма разминаване', () => {
    expect(orderInvoicesDiffer(order, [])).toBe(false);
    expect(orderInvoicesDiffer(order, [regular({ status: 'CANCELLED', total: 5 })])).toBe(false);
    expect(
      orderInvoicesDiffer(order, [{ type: 'ADVANCE', status: 'ISSUED', subtotal: 10, vatAmount: 2, total: 12 }]),
    ).toBe(false);
  });

  it('обикновена фактура, равна на продажбата → съвпада', () => {
    expect(orderInvoicesDiffer(order, [regular()])).toBe(false);
  });

  it('продажбата е редактирана след издаване → разминаване', () => {
    expect(orderInvoicesDiffer({ subtotal: 90, vatAmount: 18, total: 108 }, [regular()])).toBe(true);
    // само ДДС ставката се е сменила
    expect(orderInvoicesDiffer({ subtotal: 100, vatAmount: 0, total: 100 }, [regular()])).toBe(true);
  });

  it('окончателна + приспаднат аванс покриват продажбата', () => {
    const final = {
      type: 'FINAL',
      status: 'ISSUED',
      subtotal: 70,
      vatAmount: 14,
      total: 84,
      advanceDeductions: [{ subtotal: 30, vatAmount: 6, total: 36 }],
    };
    expect(orderInvoicesDiffer(order, [final])).toBe(false);
    expect(orderInvoicesDiffer({ ...order, total: 130, subtotal: 108.33, vatAmount: 21.67 }, [final])).toBe(true);
  });

  it('стотинка от закръгляне в основата не е разминаване', () => {
    expect(orderInvoicesDiffer(order, [regular({ subtotal: 100.01, vatAmount: 19.99 })])).toBe(false);
    expect(orderInvoicesDiffer(order, [regular({ total: 120.01 })])).toBe(false);
    expect(orderInvoicesDiffer(order, [regular({ total: 120.02 })])).toBe(true);
  });
});
