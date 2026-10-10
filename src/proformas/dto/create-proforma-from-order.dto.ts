import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

// Проформа по продажба: цялата сума (редовете на продажбата) или част
// (един ред „Проформа по поръчка …" — за аванс), както при фактурата
export class CreateProformaFromOrderDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsDateString()
  @IsOptional()
  proformaDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
