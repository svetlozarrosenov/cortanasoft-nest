import { IsString, IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CreateTimeLogDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours: number;

  @IsOptional()
  @IsString()
  description?: string;
}
