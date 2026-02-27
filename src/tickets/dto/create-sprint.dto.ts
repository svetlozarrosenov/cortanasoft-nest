import { IsString, IsOptional, IsDateString, IsNumber, IsArray, Min } from 'class-validator';

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
  hoursPerDay?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
