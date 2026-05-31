import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAdvanceInvoiceDto {
  @IsString()
  orderId: string;

  // Gross amount (incl. VAT) of the advance payment
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Optional override for the single line-item description on the advance invoice.
  // Defaults to "Авансово плащане по поръчка {orderNumber}" if not provided.
  // ЗДДС чл. 113, ал. 4 requires the document to state "what the payment derives from" —
  // this lets the merchant supply contract refs, project names, instalment numbers, etc.
  @IsOptional()
  @IsString()
  itemDescription?: string;
}
