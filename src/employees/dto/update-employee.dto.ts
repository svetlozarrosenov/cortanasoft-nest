import { IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class UpdateEmployeeDto {
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  maxVacationDays?: number | null;

  // Позиция от HR > Позиции; null = без позиция
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsOptional()
  positionId?: string | null;

  // Лична ставка НА ЧАС; null = наследява от позицията
  @ValidateIf((_, v) => v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  hourlyRate?: number | null;
}
