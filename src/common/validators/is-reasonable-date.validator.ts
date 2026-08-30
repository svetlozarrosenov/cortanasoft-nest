import { registerDecorator, ValidationOptions } from 'class-validator';

// Года̀та трябва да е в разумни граници. HTML date input приема ръчно изписана
// „година 3" (0003-08-12), а @IsDateString я пуска — така на прод се появи
// партида със срок на годност 12.08.0003. Прилага се върху дати на партиди
// (производство/срок на годност) навсякъде, където операторът ги въвежда.
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

export function IsReasonableDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isReasonableDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} трябва да е дата между ${MIN_YEAR} и ${MAX_YEAR} г.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const year = new Date(value).getFullYear();
          return !Number.isNaN(year) && year >= MIN_YEAR && year <= MAX_YEAR;
        },
      },
    });
  };
}
