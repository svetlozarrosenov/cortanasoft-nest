import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateDealTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
