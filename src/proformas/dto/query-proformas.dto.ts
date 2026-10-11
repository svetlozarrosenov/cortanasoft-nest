import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class QueryProformasDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  // UNPAID = издадени + частично платени; OVERDUE = неплатени с минал падеж
  @IsIn([
    'DRAFT',
    'ISSUED',
    'PAID',
    'PARTIALLY_PAID',
    'CANCELLED',
    'UNPAID',
    'OVERDUE',
  ])
  status?: InvoiceStatus | 'UNPAID' | 'OVERDUE';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
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

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
