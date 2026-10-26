/**
 * Изравняване на ДДС по редовете („penny rounding").
 *
 * Доставчикът смята ДДС веднъж, върху общата данъчна основа (60.83 × 20% =
 * 12.17). Ако ние го смятаме ред по ред и закръгляме всеки ред, сборът може
 * да се разминава със стотинка (2.00 + 7.33 + 2.83 = 12.16). Документът е
 * истината: разликата от закръглянето отива върху най-големия ред, така че
 * редовете остават с верните си ставки, а сборът съвпада с фактурата.
 *
 * Същият файл стои във frontend/src/lib/vat-rounding.ts — при промяна се
 * сменят и двата.
 */
export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface VatLine {
  /** Нетна стойност на реда */
  amount: number;
  vatRate: number;
  vatAmount: number;
}

const lineVat = (line: VatLine, rate = line.vatRate) =>
  round2((line.amount * rate) / 100);

const largest = <T extends VatLine>(lines: T[]) =>
  lines.reduce((best, l) => (l.amount > best.amount ? l : best), lines[0]);

/**
 * Връща копие на редовете с изравнено ДДС. Самите редове не се променят.
 *
 * - С `documentVat` (ДДС, прочетено от документа): разликата между него и
 *   сбора на редовете отива върху най-големия ред с ненулева ставка, но само
 *   ако е от закръгляне (до 1 стотинка на ред). По-голяма разлика означава,
 *   че документът се различава по друга причина — редовете се връщат както
 *   са, за да ги види операторът.
 * - Без `documentVat` (ръчно въвеждане): за всяка ставка ДДС се смята върху
 *   общата основа на редовете с тази ставка и разликата отива върху
 *   най-големия от тях. Ред, чието ДДС операторът е променил на ръка
 *   (повече от стотинка от изчисленото), се пази и не участва.
 */
export function alignLineVat<T extends VatLine>(
  lines: T[],
  documentVat?: number | null,
): T[] {
  if (lines.length === 0) return lines;
  const out = lines.map((l) => ({ ...l }));

  if (documentVat != null) {
    const sum = round2(out.reduce((s, l) => s + l.vatAmount, 0));
    const diff = round2(documentVat - sum);
    if (diff === 0) return out;
    if (Math.abs(diff) > out.length * 0.01 + 0.001) return out;
    const taxable = out.filter((l) => l.vatRate > 0);
    const target = largest(taxable.length ? taxable : out);
    target.vatAmount = round2(target.vatAmount + diff);
    return out;
  }

  const rates = Array.from(new Set(out.map((l) => l.vatRate)));
  for (const rate of rates) {
    if (rate <= 0) continue;
    const auto = out.filter(
      (l) => l.vatRate === rate && Math.abs(l.vatAmount - lineVat(l)) <= 0.011,
    );
    if (auto.length === 0) continue;
    auto.forEach((l) => {
      l.vatAmount = lineVat(l);
    });
    const base = round2(auto.reduce((s, l) => s + l.amount, 0));
    const expected = round2((base * rate) / 100);
    const diff = round2(
      expected - round2(auto.reduce((s, l) => s + l.vatAmount, 0)),
    );
    if (diff !== 0) {
      const target = largest(auto);
      target.vatAmount = round2(target.vatAmount + diff);
    }
  }
  return out;
}
