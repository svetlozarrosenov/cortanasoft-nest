import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export type OrderListView = 'open' | 'to-ship' | 'unpaid' | 'all';

export class QueryOrdersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  // econt/speedy покриват и legacy вариантите (econt_office, econt_address)
  @IsString()
  @IsOptional()
  @IsIn(['none', 'manual', 'econt', 'speedy'])
  deliveryMethod?: 'none' | 'manual' | 'econt' | 'speedy';

  // Работни изгледи (табове): комбинират се с останалите филтри
  @IsString()
  @IsOptional()
  @IsIn(['open', 'to-ship', 'unpaid', 'all'])
  view?: OrderListView;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
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
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn([
    'createdAt',
    'orderDate',
    'orderNumber',
    'status',
    'total',
    'customerName',
  ])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
