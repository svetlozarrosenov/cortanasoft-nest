import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsArray, Min } from 'class-validator';

export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  hoursPerDay?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
