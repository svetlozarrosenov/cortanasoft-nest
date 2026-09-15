import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseCategory, ExpenseStatus, PaymentMethod } from '@prisma/client';
import { ExpenseItemDto } from './expense-item.dto';

export class CreateExpenseDto {
  // Заглавие на документа не се въвежда (както при фактура от доставчик):
  // ако липсва, backend-ът го извежда от първия ред
  @IsString()
  @IsOptional()
  description?: string;

  // Редове на разхода. Без `items` (стари клиенти) — един ред от
  // category/amount/vatAmount по-долу.
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseItemDto)
  items?: ExpenseItemDto[];

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  vatAmount?: number;

  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsEnum(ExpenseStatus)
  @IsOptional()
  status?: ExpenseStatus;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurringInterval?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  siteId?: string;
}
