import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Unit, ProductType } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @MaxLength(50)
  sku: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  barcode?: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @IsEnum(Unit)
  @IsOptional()
  unit?: Unit;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;

  // Валута за покупна цена
  @IsString()
  @IsOptional()
  purchaseCurrencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchaseExchangeRate?: number;

  // Валута за продажна цена
  @IsString()
  @IsOptional()
  saleCurrencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  saleExchangeRate?: number;
}
