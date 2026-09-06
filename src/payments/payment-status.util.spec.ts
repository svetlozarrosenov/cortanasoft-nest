import { derivePaymentStatus } from './payment-status.util';

describe('derivePaymentStatus', () => {
  it('PENDING when nothing is paid and there was no refund', () => {
    expect(derivePaymentStatus(0, 500, false)).toBe('PENDING');
  });

  it('PARTIAL when paid is between 0 and total', () => {
    expect(derivePaymentStatus(100, 500, false)).toBe('PARTIAL');
    expect(derivePaymentStatus(499.99, 500, false)).toBe('PARTIAL');
  });

  it('PAID at total (within rounding) and when overpaid', () => {
    expect(derivePaymentStatus(500, 500, false)).toBe('PAID');
    expect(derivePaymentStatus(499.996, 500, false)).toBe('PAID');
    expect(derivePaymentStatus(600, 500, false)).toBe('PAID');
  });

  it('REFUNDED only when a refund brought net paid back to zero', () => {
    expect(derivePaymentStatus(0, 500, true)).toBe('REFUNDED');
    // partial refund: 500 paid, 200 returned → still PARTIAL
    expect(derivePaymentStatus(300, 500, true)).toBe('PARTIAL');
  });

  it('zero-total order with no payments is PENDING, not PAID', () => {
    expect(derivePaymentStatus(0, 0, false)).toBe('PENDING');
  });
});
