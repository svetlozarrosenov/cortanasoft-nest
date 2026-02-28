import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class CreateTimeLogDto {
  @IsDateString()
  date: string;

  @ValidateIf((o) => !o.timeSpent)
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours?: number;

  @ValidateIf((o) => !o.hours)
  @IsString()
  timeSpent?: string; // e.g., "1d 2h", "3h 30m", "45m"

  @IsOptional()
  @IsString()
  description?: string;
}
