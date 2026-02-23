import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollPaymentType } from '@prisma/client';

export class CreatePayrollItemDto {
  @IsEnum(PayrollPaymentType)
  type: PayrollPaymentType;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;
}

export class CreatePayrollDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  baseSalary: number;

  @IsNumber()
  @IsOptional()
  overtimePay?: number;

  @IsNumber()
  @IsOptional()
  bonuses?: number;

  @IsNumber()
  @IsOptional()
  allowances?: number;

  @IsNumber()
  @IsOptional()
  commissions?: number;

  @IsNumber()
  @IsOptional()
  taxDeductions?: number;

  @IsNumber()
  @IsOptional()
  insuranceEmployee?: number;

  @IsNumber()
  @IsOptional()
  insuranceEmployer?: number;

  @IsNumber()
  @IsOptional()
  otherDeductions?: number;

  @IsInt()
  @IsOptional()
  workingDays?: number;

  @IsInt()
  @IsOptional()
  workedDays?: number;

  @IsInt()
  @IsOptional()
  sickLeaveDays?: number;

  @IsInt()
  @IsOptional()
  vacationDays?: number;

  @IsInt()
  @IsOptional()
  unpaidLeaveDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayrollItemDto)
  @IsOptional()
  items?: CreatePayrollItemDto[];
}
