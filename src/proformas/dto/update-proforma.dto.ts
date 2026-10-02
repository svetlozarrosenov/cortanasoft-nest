import { IsOptional, IsIn } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { InvoiceStatus } from '@prisma/client';
import { CreateProformaDto } from './create-proforma.dto';

// Проформата не е данъчен документ — редактира се всичко от създаването.
// null в незадължително поле (напр. customerId, dueDate) го изчиства.
export class UpdateProformaDto extends PartialType(CreateProformaDto) {
  @IsOptional()
  @IsIn(['DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'])
  status?: InvoiceStatus;
}
