import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';

export class CreateProductionOrderMaterialDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.001)
  plannedQuantity: number;

  @IsEnum(Unit)
  @IsOptional()
  unit?: Unit;
}

export class CreateProductionOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsString()
  productId: string;

  @IsString()
  bomId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  plannedStartDate?: string;

  @IsString()
  @IsOptional()
  plannedEndDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionOrderMaterialDto)
  materials?: CreateProductionOrderMaterialDto[];
}
