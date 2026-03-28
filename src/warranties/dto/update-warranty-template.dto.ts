import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { WarrantyType, WarrantyDurationUnit } from '@prisma/client';

export class UpdateWarrantyTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(WarrantyType)
  @IsOptional()
  type?: WarrantyType;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @IsEnum(WarrantyDurationUnit)
  @IsOptional()
  durationUnit?: WarrantyDurationUnit;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
