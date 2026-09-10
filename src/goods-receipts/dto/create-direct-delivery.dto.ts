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
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GoodsReceiptStatus } from '@prisma/client';

// Ред от директна доставка — продукт от директен ред на продажбата и
// покупната му цена при доставчика.
export class CreateDirectDeliveryItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatRate?: number;
}

// Директна доставка (drop-ship): доставка от доставчик, вързана към продажба,
// чиято стока отива право при клиента. Няма локация — не създава наличност.
export class CreateDirectDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsDateString()
  @IsOptional()
  receiptDate?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDirectDeliveryItemDto)
  items: CreateDirectDeliveryItemDto[];
}

// Смяна на статус на директна доставка: получена при клиента / отказана.
export class UpdateDirectDeliveryStatusDto {
  @IsEnum(GoodsReceiptStatus)
  status: GoodsReceiptStatus;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;
}
