import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryLeadsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unlinked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'lastName';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
