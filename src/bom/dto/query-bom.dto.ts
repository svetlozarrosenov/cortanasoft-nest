import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryBOMDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
