import { IsOptional, IsString, IsInt, IsEnum, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceAssetStatus } from '@prisma/client';

export class QueryServiceAssetsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(ServiceAssetStatus)
  @IsOptional()
  status?: ServiceAssetStatus;

  @IsString()
  @IsOptional()
  customerId?: string;

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
  @IsIn(['createdAt', 'name', 'assetNumber', 'serialNumber'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
