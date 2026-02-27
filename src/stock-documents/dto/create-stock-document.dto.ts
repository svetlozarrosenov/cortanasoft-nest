import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockDocumentType } from '@prisma/client';

export class CreateStockDocumentItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  vatRate: number;
}

export class CreateStockDocumentDto {
  @IsEnum(StockDocumentType)
  type: StockDocumentType;

  @IsString()
  @IsOptional()
  documentDate?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  recipientName: string;

  @IsString()
  @IsOptional()
  recipientEik?: string;

  @IsString()
  @IsOptional()
  recipientAddress?: string;

  @IsString()
  @IsOptional()
  recipientCity?: string;

  @IsString()
  @IsOptional()
  senderRepresentative?: string;

  @IsString()
  @IsOptional()
  receiverRepresentative?: string;

  // For Ascertainment Protocol
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  findings?: string;

  @IsString()
  @IsOptional()
  conclusion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  commissionMembers?: string[];

  // Links
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Items
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockDocumentItemDto)
  @IsOptional()
  items?: CreateStockDocumentItemDto[];
}
