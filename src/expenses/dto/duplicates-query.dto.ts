import { IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// Проверка за дублиран разход (Odoo „duplicated vendor reference"):
// по номер на фактура, а без номер — по доставчик + сума + дата
export class DuplicatesQueryDto {
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  expenseDate?: string;

  // При редакция — самият разход не е дубликат на себе си
  @IsString()
  @IsOptional()
  excludeId?: string;
}
