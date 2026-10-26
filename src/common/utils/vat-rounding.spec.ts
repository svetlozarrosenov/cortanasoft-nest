import { alignLineVat } from './vat-rounding';

// Фактура 0000000125 на ВИДЕВ ТВ (тикет #45 Инатех): три реда, основа
// 60.83, ДДС на документа 12.17, ред по ред дава 12.16.
const videv = [
  { amount: 9.99, vatRate: 20, vatAmount: 2.0 },
  { amount: 36.67, vatRate: 20, vatAmount: 7.33 },
  { amount: 14.17, vatRate: 20, vatAmount: 2.83 },
];
const sumVat = (lines: { vatAmount: number }[]) =>
  Math.round(lines.reduce((s, l) => s + l.vatAmount, 0) * 100) / 100;

describe('alignLineVat — ДДС от документа', () => {
  it('стотинката разлика отива върху най-големия ред', () => {
    const r = alignLineVat(videv, 12.17);
    expect(r.map((l) => l.vatAmount)).toEqual([2.0, 7.34, 2.83]);
    expect(sumVat(r)).toBe(12.17);
  });

  it('не пипа входните редове', () => {
    alignLineVat(videv, 12.17);
    expect(videv[1].vatAmount).toBe(7.33);
  });

  it('без разлика — редовете остават същите', () => {
    expect(alignLineVat(videv, 12.16).map((l) => l.vatAmount)).toEqual([
      2.0, 7.33, 2.83,
    ]);
  });

  it('разлика, по-голяма от закръгляне, не се разпределя', () => {
    expect(alignLineVat(videv, 13.0).map((l) => l.vatAmount)).toEqual([
      2.0, 7.33, 2.83,
    ]);
  });

  it('отрицателна разлика се вади', () => {
    const r = alignLineVat(
      [
        { amount: 10.05, vatRate: 20, vatAmount: 2.01 },
        { amount: 10.05, vatRate: 20, vatAmount: 2.01 },
      ],
      4.01,
    );
    expect(sumVat(r)).toBe(4.01);
  });

  it('ред с нулева ставка не поема разликата', () => {
    const r = alignLineVat(
      [
        { amount: 100, vatRate: 0, vatAmount: 0 },
        { amount: 9.99, vatRate: 20, vatAmount: 2.0 },
      ],
      2.01,
    );
    expect(r.map((l) => l.vatAmount)).toEqual([0, 2.01]);
  });
});

describe('alignLineVat — ръчно въвеждане (по ставка върху общата основа)', () => {
  it('сборът по ставка е ДДС върху общата основа', () => {
    const r = alignLineVat(videv);
    expect(sumVat(r)).toBe(12.17);
    expect(r[1].vatAmount).toBe(7.34);
  });

  it('ръчно променен ред се пази и не участва', () => {
    const r = alignLineVat([
      { amount: 9.99, vatRate: 20, vatAmount: 0 }, // операторът го е нулирал
      { amount: 36.67, vatRate: 20, vatAmount: 7.33 },
      { amount: 14.17, vatRate: 20, vatAmount: 2.83 },
    ]);
    expect(r[0].vatAmount).toBe(0);
    // 36.67 + 14.17 = 50.84 × 20% = 10.168 → 10.17 = 7.34 + 2.83
    expect(r.map((l) => l.vatAmount)).toEqual([0, 7.34, 2.83]);
  });

  it('стара корекция от стотинка се преизчислява при промяна на редовете', () => {
    // Най-големият ред носеше +0.01; след като другият ред порасна, сборът
    // се преразпределя и не се трупат стотинки.
    const r = alignLineVat([
      { amount: 36.67, vatRate: 20, vatAmount: 7.34 },
      { amount: 14.17, vatRate: 20, vatAmount: 2.83 },
    ]);
    expect(r.map((l) => l.vatAmount)).toEqual([7.34, 2.83]);
    expect(sumVat(r)).toBe(10.17);
  });

  it('различните ставки се изравняват поотделно', () => {
    const r = alignLineVat([
      { amount: 9.99, vatRate: 20, vatAmount: 2.0 },
      { amount: 36.67, vatRate: 20, vatAmount: 7.33 },
      { amount: 10.05, vatRate: 9, vatAmount: 0.9 },
      { amount: 10.05, vatRate: 9, vatAmount: 0.9 },
    ]);
    // 46.66 × 20% = 9.332 → 9.33; 20.10 × 9% = 1.809 → 1.81
    expect(r.map((l) => l.vatAmount)).toEqual([2.0, 7.33, 0.91, 0.9]);
  });

  it('празен списък', () => {
    expect(alignLineVat([])).toEqual([]);
  });
});
