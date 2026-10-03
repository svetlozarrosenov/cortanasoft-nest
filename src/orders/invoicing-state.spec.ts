import {
  compareByInvoicingUrgency,
  computeInvoicingState,
  invoiceDueDate,
} from './invoicing-state';

const order = (overrides: Record<string, unknown> = {}) => ({
  status: 'DELIVERED',
  deliveredAt: new Date('2026-10-01T00:00:00.000Z'),
  total: 100,
  invoicedAmount: 0,
  createdAt: new Date('2026-09-30T10:00:00.000Z'),
  ...overrides,
});

describe('computeInvoicingState', () => {
  it('is null for an order that is not delivered', () => {
    expect(computeInvoicingState(order({ status: 'CONFIRMED' }))).toBeNull();
    expect(computeInvoicingState(order({ deliveredAt: null }))).toBeNull();
  });

  it('is INVOICED when the invoices cover the total', () => {
    expect(computeInvoicingState(order({ invoicedAmount: 100 }))).toBe(
      'INVOICED',
    );
    // стотинка разлика от закръгляне не връща продажбата в „за фактуриране"
    expect(computeInvoicingState(order({ invoicedAmount: 99.99 }))).toBe(
      'INVOICED',
    );
  });

  it('stays TO_INVOICE for a partly invoiced order', () => {
    const now = new Date('2026-10-02T09:00:00.000Z');
    expect(computeInvoicingState(order({ invoicedAmount: 40 }), now)).toBe(
      'TO_INVOICE',
    );
  });

  it('is TO_INVOICE through the fifth day and OVERDUE from the sixth', () => {
    // доставена на 01.10 → срок до 06.10 включително
    expect(
      computeInvoicingState(order(), new Date('2026-10-06T20:59:00.000Z')),
    ).toBe('TO_INVOICE');
    // 06.10 21:00 UTC вече е 07.10 в България
    expect(
      computeInvoicingState(order(), new Date('2026-10-06T21:00:00.000Z')),
    ).toBe('OVERDUE');
  });

  it('counts the delivery day by Bulgarian time', () => {
    // 01.10 22:30 UTC = 02.10 01:30 в България → срок до 07.10
    const lateEvening = order({
      deliveredAt: new Date('2026-10-01T22:30:00.000Z'),
    });
    expect(
      computeInvoicingState(lateEvening, new Date('2026-10-07T12:00:00.000Z')),
    ).toBe('TO_INVOICE');
    expect(
      computeInvoicingState(lateEvening, new Date('2026-10-08T12:00:00.000Z')),
    ).toBe('OVERDUE');
  });
});

describe('invoiceDueDate', () => {
  it('is five days after the delivery', () => {
    expect(invoiceDueDate(new Date('2026-10-01T00:00:00.000Z'))).toEqual(
      new Date('2026-10-06T00:00:00.000Z'),
    );
  });
});

describe('compareByInvoicingUrgency', () => {
  const waitingOld = {
    ...order({ deliveredAt: new Date('2026-09-20') }),
    id: 'waiting-old',
  };
  const waitingNew = {
    ...order({ deliveredAt: new Date('2026-10-01') }),
    id: 'waiting-new',
  };
  const invoicedOld = {
    ...order({ deliveredAt: new Date('2026-09-10'), invoicedAmount: 100 }),
    id: 'invoiced-old',
  };
  const invoicedNew = {
    ...order({ deliveredAt: new Date('2026-09-25'), invoicedAmount: 100 }),
    id: 'invoiced-new',
  };
  const notDelivered = {
    ...order({ status: 'CONFIRMED', deliveredAt: null }),
    id: 'not-delivered',
  };
  const all = [invoicedNew, notDelivered, waitingNew, invoicedOld, waitingOld];
  const ids = (direction: 'asc' | 'desc') =>
    [...all]
      .sort((a, b) => compareByInvoicingUrgency(a, b, direction))
      .map((o) => o.id);

  it('puts orders awaiting an invoice first, oldest delivery on top', () => {
    expect(ids('asc')).toEqual([
      'waiting-old',
      'waiting-new',
      'invoiced-old',
      'invoiced-new',
      'not-delivered',
    ]);
  });

  it('reverses the delivered orders and keeps undelivered ones last', () => {
    expect(ids('desc')).toEqual([
      'invoiced-new',
      'invoiced-old',
      'waiting-new',
      'waiting-old',
      'not-delivered',
    ]);
  });
});
