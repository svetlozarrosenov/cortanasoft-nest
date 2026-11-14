import {
  expenseEditableUntil,
  isExpenseEditLocked,
  startOfNextLocalMonth,
} from './expense-edit-lock';

const d = (iso: string) => new Date(iso);
const base = {
  paidAt: null as Date | null,
  cancelledAt: null as Date | null,
  createdAt: d('2026-09-10T08:00:00Z'),
  updatedAt: d('2026-09-10T08:00:00Z'),
};

describe('expense edit lock', () => {
  it('month boundary is local midnight (winter and summer time)', () => {
    // зимно време: 1 декември 00:00 София = 30 ноември 22:00 UTC
    expect(startOfNextLocalMonth(d('2026-11-14T10:00:00Z')).toISOString()).toBe(
      '2026-11-30T22:00:00.000Z',
    );
    // лятно време: 1 август 00:00 София = 31 юли 21:00 UTC
    expect(startOfNextLocalMonth(d('2026-07-05T10:00:00Z')).toISOString()).toBe(
      '2026-07-31T21:00:00.000Z',
    );
    // декември → януари
    expect(startOfNextLocalMonth(d('2026-12-20T10:00:00Z')).toISOString()).toBe(
      '2026-12-31T22:00:00.000Z',
    );
  });

  it('30 Sep 22:30 UTC is already October in Sofia', () => {
    expect(startOfNextLocalMonth(d('2026-09-30T22:30:00Z')).toISOString()).toBe(
      '2026-10-31T22:00:00.000Z',
    );
  });

  it('pending and approved are never locked', () => {
    for (const status of ['PENDING', 'APPROVED']) {
      expect(expenseEditableUntil({ ...base, status })).toBeNull();
      expect(
        isExpenseEditLocked({ ...base, status }, d('2030-01-01T00:00:00Z')),
      ).toBe(false);
    }
  });

  it('expense from September paid in October stays open through October', () => {
    const e = { ...base, status: 'PAID', paidAt: d('2026-10-07T09:00:00Z') };
    expect(isExpenseEditLocked(e, d('2026-10-31T20:00:00Z'))).toBe(false);
    expect(isExpenseEditLocked(e, d('2026-10-31T22:00:00Z'))).toBe(true);
  });

  it('entered as paid with last month\'s document date: the entry month counts', () => {
    const e = {
      ...base,
      status: 'PAID',
      paidAt: d('2026-09-28T00:00:00Z'),
      createdAt: d('2026-10-05T08:00:00Z'),
    };
    expect(isExpenseEditLocked(e, d('2026-10-06T08:00:00Z'))).toBe(false);
    expect(isExpenseEditLocked(e, d('2026-11-01T08:00:00Z'))).toBe(true);
  });

  it('cancelled: restorable until the end of the cancellation month', () => {
    const e = {
      ...base,
      status: 'CANCELLED',
      paidAt: d('2026-09-12T00:00:00Z'),
      cancelledAt: d('2026-11-03T10:00:00Z'),
    };
    expect(isExpenseEditLocked(e, d('2026-11-30T12:00:00Z'))).toBe(false);
    expect(isExpenseEditLocked(e, d('2026-12-01T12:00:00Z'))).toBe(true);
  });
});
