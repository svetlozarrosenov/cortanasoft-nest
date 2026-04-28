import { IsOptional, IsString, IsInt, IsEnum, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ServiceOrderStatus,
  ServiceOrderType,
  ServiceOrderPriority,
} from '@prisma/client';

export class QueryServiceOrdersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ServiceOrderStatus)
  @IsOptional()
  status?: ServiceOrderStatus;

  @IsEnum(ServiceOrderType)
  @IsOptional()
  type?: ServiceOrderType;

  @IsEnum(ServiceOrderPriority)
  @IsOptional()
  priority?: ServiceOrderPriority;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  assetId?: string;

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
  @IsIn(['createdAt', 'receivedAt', 'orderNumber', 'status', 'priority', 'totalAmount'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
