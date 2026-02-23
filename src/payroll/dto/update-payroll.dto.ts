import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollPaymentType, PayrollStatus } from '@prisma/client';

export class UpdatePayrollItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(PayrollPaymentType)
  type: PayrollPaymentType;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;
}

export class UpdatePayrollDto {
  @IsNumber()
  @IsOptional()
  baseSalary?: number;

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

  @IsEnum(PayrollStatus)
  @IsOptional()
  status?: PayrollStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePayrollItemDto)
  @IsOptional()
  items?: UpdatePayrollItemDto[];
}
