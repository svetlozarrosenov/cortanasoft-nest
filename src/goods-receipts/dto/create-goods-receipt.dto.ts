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
import { ExpenseCategory, StockCostAllocation } from '@prisma/client';

export class CreateGoodsReceiptItemDto {
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

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  exchangeRate?: number;
}

export class CreateGoodsReceiptExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  exchangeRate?: number;

  // Влиза ли в себестойността на стоката (виж Expense.includeInStockCost)
  @IsBoolean()
  @IsOptional()
  includeInStockCost?: boolean;

  // По стойност (по подразбиране) или по количество
  @IsEnum(StockCostAllocation)
  @IsOptional()
  stockCostAllocation?: StockCostAllocation;
}

export class CreateGoodsReceiptDto {
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @IsDateString()
  @IsOptional()
  receiptDate?: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

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

  // ВОП: фактурата е без ДДС — сървърът нулира ставката на всички редове
  @IsBoolean()
  @IsOptional()
  reverseChargeVat?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptItemDto)
  items: CreateGoodsReceiptItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptExpenseDto)
  expenses?: CreateGoodsReceiptExpenseDto[];
}
