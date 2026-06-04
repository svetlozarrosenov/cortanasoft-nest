import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentContractType, EmploymentContractStatus } from '@prisma/client';

export class CreateEmploymentContractDto {
  // Служител (User в контекста на компанията)
  @IsString()
  userId: string;

  // Номер — ако липсва, се генерира автоматично (TD-2026-00001)
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsEnum(EmploymentContractType)
  type?: EmploymentContractType;

  @IsOptional()
  @IsEnum(EmploymentContractStatus)
  status?: EmploymentContractStatus;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  nkpdCode?: string;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  workingHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  probationMonths?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
