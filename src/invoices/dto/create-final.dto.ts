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
}
