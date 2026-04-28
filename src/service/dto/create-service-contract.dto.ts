import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { ServiceContractStatus } from '@prisma/client';

export class CreateServiceContractDto {
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  name: string;

  @IsEnum(ServiceContractStatus)
  @IsOptional()
  status?: ServiceContractStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyFee?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  includedHoursPerMonth?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  responseTimeHours?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  customerId: string;
}
