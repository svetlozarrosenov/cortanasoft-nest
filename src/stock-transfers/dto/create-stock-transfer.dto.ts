import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockTransferItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  serialIds?: string[];
}

export class CreateStockTransferDto {
  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @IsString()
  @IsNotEmpty()
  fromLocationId: string;

  @IsString()
  @IsNotEmpty()
  toLocationId: string;

  @IsString()
  @IsOptional()
  responsibleId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items: CreateStockTransferItemDto[];
}
