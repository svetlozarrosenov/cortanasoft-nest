import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';

const errorsOf = async (plain: object) =>
  (await validate(plainToInstance(CreateOrderItemDto, plain))).map(
    (e) => e.property,
  );

describe('CreateOrderItemDto.description', () => {
  const base = { productId: 'p1', quantity: 1, unitPrice: 10 };

  it('е незадължително', async () => {
    expect(await errorsOf(base)).toEqual([]);
  });

  it('приема текст до 500 знака', async () => {
    expect(
      await errorsOf({ ...base, description: 'Монтаж на климатик, 3 ет.' }),
    ).toEqual([]);
    expect(await errorsOf({ ...base, description: 'x'.repeat(500) })).toEqual(
      [],
    );
  });

  it('отхвърля над 500 знака и не-текст', async () => {
    expect(await errorsOf({ ...base, description: 'x'.repeat(501) })).toEqual([
      'description',
    ]);
    expect(await errorsOf({ ...base, description: 123 })).toEqual([
      'description',
    ]);
  });
});
