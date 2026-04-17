import { IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPaymentsDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
