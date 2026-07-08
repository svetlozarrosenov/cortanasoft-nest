import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsString()
  orderId: string;

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
