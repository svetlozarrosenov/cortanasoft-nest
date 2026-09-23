import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryProfitAnalyticsDto {
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  // Обект (Order.siteId) — за отчетите по продажби и P&L
  @IsString()
  @IsOptional()
  siteId?: string;
}
