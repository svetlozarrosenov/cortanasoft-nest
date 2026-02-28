import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GoodsReceiptStatus } from '@prisma/client';
import { CreateGoodsReceiptItemDto } from './create-goods-receipt.dto';

export class UpdateGoodsReceiptDto {
  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(GoodsReceiptStatus)
  @IsOptional()
  status?: GoodsReceiptStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items?: CreateGoodsReceiptItemDto[];
}
