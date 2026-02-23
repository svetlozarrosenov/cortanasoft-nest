import { IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsIn(['CASH', 'CARD', 'BANK_TRANSFER', 'COD'])
  paymentMethod?: PaymentMethod;
}
