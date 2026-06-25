import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateContactSubmissionTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
