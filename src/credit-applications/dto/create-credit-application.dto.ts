import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreditBank } from '@prisma/client';

export class CreateCreditApplicationDto {
  @IsString()
  orderId: string;

  @IsEnum(CreditBank)
  bank: CreditBank;

  @IsOptional()
  @IsString()
  bankRef?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  requestedAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPayment?: number;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
