import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { UpdateCustomerDto } from './update-customer.dto';

const errorsOf = async (cls: any, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe('CreateCustomerDto', () => {
  it('изисква type', async () => {
    expect(await errorsOf(CreateCustomerDto, { firstName: 'Jane' })).toContain(
      'type',
    );
  });

  it('фирма без companyName е невалидна', async () => {
    expect(await errorsOf(CreateCustomerDto, { type: 'COMPANY' })).toEqual([
      'companyName',
    ]);
  });

  it('фирма с companyName е валидна без имена на лице', async () => {
    expect(
      await errorsOf(CreateCustomerDto, {
        type: 'COMPANY',
        companyName: 'ACME Ltd',
      }),
    ).toEqual([]);
  });

  it('физическо лице без име и фамилия е невалидно', async () => {
    const props = await errorsOf(CreateCustomerDto, { type: 'INDIVIDUAL' });
    expect(props).toEqual(expect.arrayContaining(['firstName', 'lastName']));
  });

  it('физическо лице само с фамилия е валидно', async () => {
    expect(
      await errorsOf(CreateCustomerDto, {
        type: 'INDIVIDUAL',
        lastName: 'Doe',
      }),
    ).toEqual([]);
  });

  it('физическо лице не изисква companyName', async () => {
    expect(
      await errorsOf(CreateCustomerDto, {
        type: 'INDIVIDUAL',
        firstName: 'John',
      }),
    ).toEqual([]);
  });
});

describe('UpdateCustomerDto', () => {
  it('PATCH без type не изисква имена', async () => {
    expect(await errorsOf(UpdateCustomerDto, { phone: '0888' })).toEqual([]);
  });

  // PartialType прави всички полета IsOptional, така че условните проверки
  // важат само при създаване; при PATCH формата праща целия обект.
  it('PATCH само с type не изисква companyName', async () => {
    expect(await errorsOf(UpdateCustomerDto, { type: 'COMPANY' })).toEqual([]);
  });
});
