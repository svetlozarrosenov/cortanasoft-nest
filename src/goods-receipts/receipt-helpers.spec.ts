import { computeUnitCosts } from './receipt-helpers';

const item = (
  id: string,
  quantity: number,
  unitPrice: number,
  exchangeRate = 1,
  type = 'PRODUCT',
) => ({ id, quantity, unitPrice, exchangeRate, product: { type } });

describe('computeUnitCosts', () => {
  it('converts the line price into the company currency', () => {
    // 10 бр. × 5 EUR × 1.95583 = 9.78 BGN/бр.
    const m = computeUnitCosts([item('a', 10, 5, 1.95583)], []);
    expect(m.get('a')).toBe(9.78);
  });

  it('spreads included expenses proportionally to line value', () => {
    // Ред a: 10 × 10 = 100; ред b: 5 × 60 = 300 → транспорт 40 се дели 10/30
    const m = computeUnitCosts(
      [item('a', 10, 10), item('b', 5, 60)],
      [
        { amount: 40, includeInStockCost: true },
        { amount: 999, includeInStockCost: false },
      ],
    );
    expect(m.get('a')).toBe(11); // (100 + 10) / 10
    expect(m.get('b')).toBe(66); // (300 + 30) / 5
  });

  it('spreads a by-quantity expense equally per unit regardless of price', () => {
    // 2 скъпи + 8 евтини велосипеда, транспорт 100 „по количество" → 10/бр.
    const m = computeUnitCosts(
      [item('a', 2, 3000), item('b', 8, 300)],
      [
        {
          amount: 100,
          includeInStockCost: true,
          stockCostAllocation: 'QUANTITY',
        },
      ],
    );
    expect(m.get('a')).toBe(3010);
    expect(m.get('b')).toBe(310);
  });

  it('combines by-value and by-quantity expenses', () => {
    // Ред a: 10×10=100, ред b: 10×30=300. Мито 40 по стойност → 10/30;
    // транспорт 20 по количество → 10/10.
    const m = computeUnitCosts(
      [item('a', 10, 10), item('b', 10, 30)],
      [
        {
          amount: 40,
          includeInStockCost: true,
          stockCostAllocation: 'VALUE',
        },
        {
          amount: 20,
          includeInStockCost: true,
          stockCostAllocation: 'QUANTITY',
        },
      ],
    );
    expect(m.get('a')).toBe(12); // (100 + 10 + 10) / 10
    expect(m.get('b')).toBe(34); // (300 + 30 + 10) / 10
  });

  it('leaves the cost untouched when no expense is included', () => {
    const m = computeUnitCosts(
      [item('a', 10, 10)],
      [{ amount: 40, includeInStockCost: false }],
    );
    expect(m.get('a')).toBe(10);
  });

  it('does not charge services and excludes them from the base', () => {
    const m = computeUnitCosts(
      [item('a', 10, 10), item('svc', 1, 50, 1, 'SERVICE')],
      [{ amount: 20, includeInStockCost: true }],
    );
    expect(m.get('a')).toBe(12); // всичките 20 отиват при стоката
    expect(m.get('svc')).toBe(50);
  });

  it('falls back to quantity when the goods are free', () => {
    const m = computeUnitCosts(
      [item('a', 3, 0), item('b', 1, 0)],
      [{ amount: 8, includeInStockCost: true }],
    );
    expect(m.get('a')).toBe(2);
    expect(m.get('b')).toBe(2);
  });
});
