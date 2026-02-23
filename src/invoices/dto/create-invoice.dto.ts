import { IsString, IsOptional, IsDateString } from 'class-validator';

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
}
