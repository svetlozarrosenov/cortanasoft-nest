import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ContactSubmissionStatus } from '@prisma/client';

export class UpdateContactSubmissionDto {
  @IsOptional()
  @IsEnum(ContactSubmissionStatus)
  status?: ContactSubmissionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  repliedAt?: string;
}
