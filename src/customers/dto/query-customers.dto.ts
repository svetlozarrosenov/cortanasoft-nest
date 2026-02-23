import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CustomerType, CustomerStage, CustomerSource } from '@prisma/client';

export class QueryCustomersDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsEnum(CustomerStage)
  @IsOptional()
  stage?: CustomerStage;

  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;

  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  @IsDateString()
  @IsOptional()
  createdTo?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
