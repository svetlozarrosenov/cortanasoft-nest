import { IsOptional, IsString, IsInt, IsEnum, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceContractStatus } from '@prisma/client';

export class QueryServiceContractsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ServiceContractStatus)
  @IsOptional()
  status?: ServiceContractStatus;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'contractNumber', 'startDate'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
