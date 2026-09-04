import { buildTokenSearch } from './search-tokens';

describe('buildTokenSearch', () => {
  it('returns undefined for empty / whitespace input', () => {
    expect(buildTokenSearch(undefined, ['name'])).toBeUndefined();
    expect(buildTokenSearch('', ['name'])).toBeUndefined();
    expect(buildTokenSearch('   ', ['name'])).toBeUndefined();
  });

  it('builds one OR-group per word, ANDed together', () => {
    const result = buildTokenSearch('кабел 3x1.5', ['name', 'sku']);

    expect(result).toEqual({
      AND: [
        {
          OR: [
            { name: { contains: 'кабел', mode: 'insensitive' } },
            { sku: { contains: 'кабел', mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { name: { contains: '3x1.5', mode: 'insensitive' } },
            { sku: { contains: '3x1.5', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('supports relation fields via a builder function', () => {
    const result = buildTokenSearch('lan', [
      'name',
      (f) => ({ category: { name: f } }),
    ]);

    expect(result?.AND[0]).toEqual({
      OR: [
        { name: { contains: 'lan', mode: 'insensitive' } },
        { category: { name: { contains: 'lan', mode: 'insensitive' } } },
      ],
    });
  });

  it('caps the number of tokens at 5', () => {
    const result = buildTokenSearch('a b c d e f g', ['name']);
    expect(result?.AND).toHaveLength(5);
  });
});
