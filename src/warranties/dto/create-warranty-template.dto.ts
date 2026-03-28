import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { WarrantyType, WarrantyDurationUnit } from '@prisma/client';

export class CreateWarrantyTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(WarrantyType)
  @IsOptional()
  type?: WarrantyType;

  @IsInt()
  @Min(1)
  duration: number;

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
