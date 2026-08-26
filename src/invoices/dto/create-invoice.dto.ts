import { IsString, IsOptional, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateInvoiceDto {
  @IsString()
  orderId: string;

  // Начин на плащане върху фактурата. По подразбиране — този от поръчката,
  // но операторът може да го смени (напр. „наложен платеж" от магазина реално
  // се изплаща като „пощенски паричен превод" — Наредба Н-18 разлика).
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Gross amount (incl. VAT) to invoice. Defaults to the remaining un-invoiced balance on the order.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  // Bill-to override: издай фактурата на друг клиент от CRM (напр. поръчка,
  // направена от физическо лице, но фактурирана на неговата фирма).
  // Данните за доставка по поръчката остават непроменени.
  @IsOptional()
  @IsString()
  billToCustomerId?: string;
}
