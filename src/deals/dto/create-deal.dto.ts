import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { DealStatus } from '@prisma/client';

export class CreateDealDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currencyId?: string;

  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
