import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { StockTransferStatus } from '@prisma/client';

export class QueryStockTransfersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StockTransferStatus)
  @IsOptional()
  status?: StockTransferStatus;

  @IsString()
  @IsOptional()
  fromLocationId?: string;

  @IsString()
  @IsOptional()
  toLocationId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'transferDate', 'transferNumber', 'status'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
