import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
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
}
