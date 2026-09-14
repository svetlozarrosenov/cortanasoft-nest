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
  IsBoolean,
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

// Редакция на дропшип заявка от Склад > Доставки: доставчик, дати, фактура,
// редове (количество/покупна цена). Редовете са само продукти от директните
// редове на продажбата. Пълна редакция докато е EXPECTED; при DELIVERED —
// само фактурата и бележките.
export class UpdateDirectDeliveryDto {
  @IsString()
  @IsOptional()
  supplierId?: string | null;

  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string | null;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string | null;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectDeliveryItemDto)
  items?: CreateDirectDeliveryItemDto[];
}

// Стъпка „изпратена на доставчика" (true) / връщане в „заявка" (false)
export class SetDirectDeliverySentDto {
  @IsBoolean()
  sent: boolean;
}

// Разделяне: избраните продукти отиват в нова дропшип заявка към същата продажба
export class SplitDirectDeliveryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds: string[];
}

// Ръчно създаване на заявката за стара продажба (потвърдена преди автоматиката)
export class EnsureDirectDeliveryDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
