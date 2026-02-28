import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';

export class CreateBOMItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsEnum(Unit)
  @IsOptional()
  unit?: Unit;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBOMDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  productId: string;

  @IsNumber()
  @IsOptional()
  @Min(0.001)
  outputQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBOMItemDto)
  items: CreateBOMItemDto[];
}
