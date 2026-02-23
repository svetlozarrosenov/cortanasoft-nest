import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateProformaItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  vatRate?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;
}

export class CreateProformaDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsString()
  @IsOptional()
  customerEik?: string;

  @IsString()
  @IsOptional()
  customerVatNumber?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  customerCity?: string;

  @IsString()
  @IsOptional()
  customerPostalCode?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProformaItemDto)
  items: CreateProformaItemDto[];
}
