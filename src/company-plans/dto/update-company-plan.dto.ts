import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, CompanyPlanStatus } from '@prisma/client';

export class UpdateCompanyPlanItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  vatRate?: number;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCompanyPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsNumber()
  @Min(1)
  @Max(31)
  @IsOptional()
  billingDayOfMonth?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  invoiceNotes?: string;

  @IsEnum(CompanyPlanStatus)
  @IsOptional()
  status?: CompanyPlanStatus;

  @IsBoolean()
  @IsOptional()
  autoInvoice?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyPlanItemDto)
  @IsOptional()
  items?: UpdateCompanyPlanItemDto[];
}
