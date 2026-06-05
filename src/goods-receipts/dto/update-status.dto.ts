import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GoodsReceiptStatus } from '@prisma/client';

export class ItemSerialNumbersDto {
  @IsString()
  @IsNotEmpty()
  goodsReceiptItemId: string;

  @IsArray()
  @IsString({ each: true })
  serialNumbers: string[];
}

// Партидни данни за артикул при доставка (№ партида, срок, дата на производство)
export class ItemBatchInfoDto {
  @IsString()
  @IsNotEmpty()
  goodsReceiptItemId: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;
}

export class UpdateGoodsReceiptStatusDto {
  @IsEnum(GoodsReceiptStatus)
  status: GoodsReceiptStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSerialNumbersDto)
  itemSerials?: ItemSerialNumbersDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemBatchInfoDto)
  itemBatches?: ItemBatchInfoDto[];

  // Дата на плащане — използва се само при transition към DELIVERED_PAID.
  // Когато е празно, backend-ът използва текущия момент.
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  // Дата на реалната доставка — попълва се при transition EXPECTED → DELIVERED_*.
  // Когато е празно, backend-ът използва текущия момент.
  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}
