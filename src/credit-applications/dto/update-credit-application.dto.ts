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
import { CreditBank, CreditApplicationStatus } from '@prisma/client';

export class UpdateCreditApplicationDto {
  @IsOptional()
  @IsEnum(CreditBank)
  bank?: CreditBank;

  @IsOptional()
  @IsString()
  bankRef?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  requestedAmount?: number;

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
  @IsEnum(CreditApplicationStatus)
  status?: CreditApplicationStatus;

  @IsOptional()
  @IsDateString()
  appliedAt?: string;

  @IsOptional()
  @IsDateString()
  decisionAt?: string;

  @IsOptional()
  @IsDateString()
  signedAt?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
