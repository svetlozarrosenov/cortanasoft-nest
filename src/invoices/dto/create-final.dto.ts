import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateFinalInvoiceDto {
  @IsString()
  orderId: string;

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
}
