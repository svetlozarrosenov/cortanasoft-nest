import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ExpenseCategory, StockCostAllocation } from '@prisma/client';

// Ред на разход: категория, нетна сума, ДДС. Валута/курс и landed-cost
// флаговете се ползват от редовете, създадени през доставката.
export class ExpenseItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  // Количество × единична цена; ако липсват — amount е нетната сума на реда
  @IsNumber()
  @IsOptional()
  @Min(0.001)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatAmount?: number;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  exchangeRate?: number;

  @IsBoolean()
  @IsOptional()
  includeInStockCost?: boolean;

  @IsEnum(StockCostAllocation)
  @IsOptional()
  stockCostAllocation?: StockCostAllocation;
}
