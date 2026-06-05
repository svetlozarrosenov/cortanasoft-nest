import { IsDateString, IsOptional, IsString } from 'class-validator';

// Данни за готовата партида при завършване на производство.
// Ако липсват — батч № = PRD-<номер>, дата на производство = сега,
// срок = сега + shelfLifeDays на продукта (ако е зададен).
export class CompleteProductionOrderDto {
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
