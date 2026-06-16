import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateProformaDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'])
  status?: InvoiceStatus;
}
