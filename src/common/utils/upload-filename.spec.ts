import { decodeUploadedFileName } from './upload-filename';

/** Симулира busboy: UTF-8 байтовете на името, прочетени като Latin-1 */
const asBusboy = (utf8Name: string) =>
  Buffer.from(utf8Name, 'utf8').toString('latin1');

describe('decodeUploadedFileName', () => {
  it('restores a Cyrillic name mangled by the Latin-1 default', () => {
    expect(decodeUploadedFileName(asBusboy('части.pdf'))).toBe('части.pdf');
    expect(
      decodeUploadedFileName(
        asBusboy('Ф-ра 0000001923 ЕВРОПА ВАТ КОНСУЛТ ООД.pdf'),
      ),
    ).toBe('Ф-ра 0000001923 ЕВРОПА ВАТ КОНСУЛТ ООД.pdf');
  });

  it('restores accented Latin names too', () => {
    expect(decodeUploadedFileName(asBusboy('café résumé.pdf'))).toBe(
      'café résumé.pdf',
    );
  });

  it('leaves ASCII names untouched', () => {
    expect(decodeUploadedFileName('29968728501048236_2888.pdf')).toBe(
      '29968728501048236_2888.pdf',
    );
  });

  it('leaves an already-correct Unicode name untouched', () => {
    expect(decodeUploadedFileName('части.pdf')).toBe('части.pdf');
  });

  it('keeps a genuine Latin-1 name that is not valid UTF-8', () => {
    // "é" сам по себе си (0xE9) не е валиден UTF-8 старт байт
    expect(decodeUploadedFileName('café.pdf')).toBe('café.pdf');
  });

  it('returns empty string for missing names', () => {
    expect(decodeUploadedFileName(undefined)).toBe('');
    expect(decodeUploadedFileName(null)).toBe('');
  });
});
