import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductionOrderStatus } from '@prisma/client';

export class QueryProductionOrdersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ProductionOrderStatus)
  @IsOptional()
  status?: ProductionOrderStatus;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
