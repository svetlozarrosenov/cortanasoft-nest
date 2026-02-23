import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ExpenseCategory, ExpenseStatus } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0)
  amount: number;

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
}
