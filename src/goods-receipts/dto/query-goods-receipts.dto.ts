import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { GoodsReceiptStatus } from '@prisma/client';

export class QueryGoodsReceiptsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(GoodsReceiptStatus)
  @IsOptional()
  status?: GoodsReceiptStatus;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  // Тип на доставката: складова / дропшип (към продажба) / всички
  @IsOptional()
  @IsString()
  @IsIn(['warehouse', 'direct'])
  type?: 'warehouse' | 'direct';

  // Само дропшип заявки без доставчик (чакат обработка)
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  awaitingSupplier?: boolean;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  // По коя дата филтрират dateFrom/dateTo: доставка (по подразбиране) или
  // плащане (за сверяване с банково извлечение)
  @IsOptional()
  @IsString()
  @IsIn(['receiptDate', 'paidAt'])
  dateField?: 'receiptDate' | 'paidAt';

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
  @IsIn(['createdAt', 'receiptDate', 'receiptNumber', 'status'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
