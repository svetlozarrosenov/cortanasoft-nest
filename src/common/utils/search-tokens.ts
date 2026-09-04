/**
 * Разбива свободен текст за търсене на думи (макс. 5, за да не расте
 * SQL-ът неограничено) и връща Prisma AND-условие: всяка дума трябва да
 * се среща (case-insensitive contains) в поне едно от подадените полета.
 *
 * "кабел 3x1.5" срещу ['name', 'sku', 'barcode'] →
 *   AND: [
 *     { OR: [{name contains 'кабел'}, {sku contains 'кабел'}, {barcode contains 'кабел'}] },
 *     { OR: [{name contains '3x1.5'}, ...] },
 *   ]
 *
 * Полето може да е и функция за релации: (t) => ({ category: { name: t } }).
 * Връща undefined при празен вход, така че може да се spread-не директно.
 */
type ContainsFilter = { contains: string; mode: 'insensitive' };
type SearchField = string | ((filter: ContainsFilter) => Record<string, unknown>);

export function buildTokenSearch<TWhere = Record<string, unknown>>(
  search: string | undefined | null,
  fields: SearchField[],
): { AND: TWhere[] } | undefined {
  const tokens = (search ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  if (tokens.length === 0) return undefined;

  return {
    AND: tokens.map((token) => {
      const filter: ContainsFilter = { contains: token, mode: 'insensitive' };
      return {
        OR: fields.map((field) =>
          typeof field === 'function' ? field(filter) : { [field]: filter },
        ),
      } as unknown as TWhere;
    }),
  };
}
