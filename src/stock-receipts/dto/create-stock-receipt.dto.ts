import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockReceiptItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vatRate: number;
}

export class CreateStockReceiptDto {
  @IsOptional()
  @IsString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  recipientName: string;

  @IsOptional()
  @IsString()
  recipientEik?: string;

  @IsOptional()
  @IsString()
  recipientAddress?: string;

  @IsOptional()
  @IsString()
  recipientCity?: string;

  @IsOptional()
  @IsString()
  senderRepresentative?: string;

  @IsOptional()
  @IsString()
  receiverRepresentative?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  serviceOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockReceiptItemDto)
  items?: CreateStockReceiptItemDto[];
}
