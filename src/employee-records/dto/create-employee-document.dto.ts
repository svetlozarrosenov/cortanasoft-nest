import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeDocumentCategory } from '@prisma/client';

export class CreateEmployeeDocumentDto {
  // Служител (User в контекста на компанията)
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(EmployeeDocumentCategory)
  category?: EmployeeDocumentCategory;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
