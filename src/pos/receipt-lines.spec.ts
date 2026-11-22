import { buildReceiptLines, SaleItem } from './receipt-lines';
import {
  calculateDocumentTotals,
  round2,
} from '../common/utils/document-totals';

const item = (over: Partial<SaleItem>): SaleItem => ({
  productId: 'p',
  name: 'Боя',
  quantity: 1,
  unitPrice: 10,
  vatRate: 20,
  ...over,
});

// The total an order made of the same items gets (see OrdersService.create)
function orderTotal(items: SaleItem[]): number {
  const lines = items.map((i) => ({
    subtotal: round2(i.quantity * i.unitPrice),
    vatRate: i.vatRate,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
  return calculateDocumentTotals(lines, subtotal, {}).total;
}

// What the register computes: unit price times quantity, rounded per line
// (whole numbers throughout, so the check itself cannot drift)
function receiptTotal(
  lines: { unitPrice: string; quantity: string }[],
): number {
  return (
    lines.reduce((sum, l) => {
      const cents = Math.round(Number(l.unitPrice) * 100);
      const milli = Math.round(Number(l.quantity) * 1000);
      expect((cents * milli) % 1000).not.toBe(500);
      return sum + Math.round((cents * milli) / 1000);
    }, 0) / 100
  );
}

describe('buildReceiptLines', () => {
  it('prints the price with VAT and the VAT group of the rate', () => {
    const { lines, total } = buildReceiptLines([
      item({ unitPrice: 10, vatRate: 20, quantity: 2, unit: 'бр.' }),
      item({ unitPrice: 5, vatRate: 9 }),
      item({ unitPrice: 3, vatRate: 0 }),
    ]);
    expect(lines).toEqual([
      {
        name: 'Боя',
        vatGroup: 'B',
        unitPrice: '12.00',
        quantity: '2',
        unit: 'бр.',
      },
      {
        name: 'Боя',
        vatGroup: 'D',
        unitPrice: '5.45',
        quantity: '1',
        unit: undefined,
      },
      {
        name: 'Боя',
        vatGroup: 'A',
        unitPrice: '3.00',
        quantity: '1',
        unit: undefined,
      },
    ]);
    expect(total).toBe(32.45);
  });

  it('folds the quantity into the name when no unit price gives the line total', () => {
    // 3 x 1.66 = 4.98 + 20% = 5.98, but 5.98 / 3 is not a whole number of cents
    const { lines, total } = buildReceiptLines([
      item({ unitPrice: 1.66, quantity: 3 }),
    ]);
    expect(lines).toEqual([
      { name: '3 x Боя', vatGroup: 'B', unitPrice: '5.98', quantity: '1' },
    ]);
    expect(total).toBe(5.98);
  });

  it('always totals exactly what the order will total', () => {
    const prices = [0.01, 0.33, 1.66, 2.49, 4.17, 9.99, 12.5, 83.33, 199.99];
    const quantities = [1, 2, 3, 7, 0.5, 1.255, 12];
    const rates = [0, 9, 20];
    for (const unitPrice of prices) {
      for (const quantity of quantities) {
        for (const vatRate of rates) {
          const items = [
            item({ unitPrice, quantity, vatRate }),
            item({ unitPrice: 1.66, quantity: 3 }),
          ];
          const { lines, total } = buildReceiptLines(items);
          expect(total).toBe(orderTotal(items));
          expect(receiptTotal(lines)).toBe(total);
        }
      }
    }
  });

  it('refuses a VAT rate the register has no group for', () => {
    expect(() => buildReceiptLines([item({ vatRate: 7 })])).toThrow(
      'Unsupported VAT rate',
    );
  });
});
