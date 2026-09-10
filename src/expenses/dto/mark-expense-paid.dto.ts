import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

// „Маркирай като платен" — по избор уточнява как е платено.
export class MarkExpensePaidDto {
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}
