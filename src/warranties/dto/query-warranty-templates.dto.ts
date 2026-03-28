import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { WarrantyType } from '@prisma/client';

export class QueryWarrantyTemplatesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(WarrantyType)
  type?: WarrantyType;

  @IsOptional()
  @IsString()
  isActive?: string; // 'true' | 'false'

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
