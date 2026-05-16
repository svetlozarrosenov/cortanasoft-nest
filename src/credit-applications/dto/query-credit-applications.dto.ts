import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreditApplicationStatus, CreditBank } from '@prisma/client';

export class QueryCreditApplicationsDto {
  @IsOptional()
  @IsEnum(CreditApplicationStatus)
  status?: CreditApplicationStatus;

  @IsOptional()
  @IsEnum(CreditBank)
  bank?: CreditBank;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
