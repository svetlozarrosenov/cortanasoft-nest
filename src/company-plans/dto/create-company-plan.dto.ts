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

export class CreateCompanyPlanItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

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

export class CreateCompanyPlanDto {
  @IsString()
  companyId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

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
  startDate: string;

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
  @Type(() => CreateCompanyPlanItemDto)
  @IsOptional()
  items?: CreateCompanyPlanItemDto[];
}
