import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const SHIPMENT_STATUSES = [
  'PENDING',
  'CREATED',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;

/** Филтри за списъка „Пратки" (ERP > Пратки) — всичко е на сървъра. */
export class QueryShipmentsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  status?: (typeof SHIPMENT_STATUSES)[number];

  @IsOptional()
  @IsIn(['econt', 'speedy'])
  provider?: string;

  // YYYY-MM-DD (локална дата от филтъра), включително
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
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
  @Max(200)
  limit?: number;
}
