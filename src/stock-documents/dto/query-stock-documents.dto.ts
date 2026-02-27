import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { StockDocumentType, StockDocumentStatus } from '@prisma/client';

export class QueryStockDocumentsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(StockDocumentType)
  @IsOptional()
  type?: StockDocumentType;

  @IsEnum(StockDocumentStatus)
  @IsOptional()
  status?: StockDocumentStatus;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsNumberString()
  @IsOptional()
  page?: number;

  @IsNumberString()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
