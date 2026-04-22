import { IsString, IsOptional, IsDateString, IsArray } from 'class-validator';

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
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
