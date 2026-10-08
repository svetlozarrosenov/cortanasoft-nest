import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { EmployeeAdvanceType, PaymentMethod } from '@prisma/client';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEmployeeAdvanceDto {
  @IsString()
  userId: string;

  @IsEnum(EmployeeAdvanceType)
  @IsOptional()
  type?: EmployeeAdvanceType;

  @Matches(DATE)
  date: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

export class UpdateEmployeeAdvanceDto {
  @IsEnum(EmployeeAdvanceType)
  @IsOptional()
  type?: EmployeeAdvanceType;

  @Matches(DATE)
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string | null;
}

export class LedgerQueryDto {
  @Matches(DATE)
  @IsOptional()
  from?: string;

  @Matches(DATE)
  @IsOptional()
  to?: string;
}
