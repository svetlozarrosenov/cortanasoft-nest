import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateFinalInvoiceDto {
  @IsString()
  orderId: string;

  // Начин на плащане върху фактурата (по подразбиране — от поръчката)
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  // ADVANCE invoices to deduct in this final invoice
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  advanceInvoiceIds: string[];

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Optional template for the per-advance deduction line description.
  // Placeholder {invoiceNumber} is substituted with each advance's invoice number.
  // Defaults to "Приспадане на авансово плащане по фактура {invoiceNumber}".
  @IsOptional()
  @IsString()
  deductionDescriptionTemplate?: string;

  // Bill-to override: издай финалната на друг клиент от CRM (виж CreateInvoiceDto).
  @IsOptional()
  @IsString()
  billToCustomerId?: string;
}
