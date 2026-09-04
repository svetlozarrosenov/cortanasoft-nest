import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
  IsIn,
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

  // Само партньори (прекупвачи) — ползва се от select-а „Доведен от"
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isPartner?: boolean;

  // Клиенти, доведени от конкретен партньор
  @IsString()
  @IsOptional()
  referredById?: string;

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
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  // Бял списък — sortBy отива директно в Prisma orderBy
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'companyName', 'firstName', 'lastName', 'email', 'city', 'stage', 'type'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
