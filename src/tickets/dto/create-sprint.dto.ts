import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateSprintDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  workersCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  hoursPerDay?: number;
}
