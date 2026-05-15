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

export class UpdateGoodsReceiptStatusDto {
  @IsEnum(GoodsReceiptStatus)
  status: GoodsReceiptStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSerialNumbersDto)
  itemSerials?: ItemSerialNumbersDto[];

  // Дата на плащане — използва се само при transition към DELIVERED_PAID.
  // Когато е празно, backend-ът използва текущия момент.
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
