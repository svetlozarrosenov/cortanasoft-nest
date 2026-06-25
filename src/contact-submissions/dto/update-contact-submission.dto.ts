import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ContactSubmissionStatus } from '@prisma/client';

export class UpdateContactSubmissionDto {
  @IsOptional()
  @IsEnum(ContactSubmissionStatus)
  status?: ContactSubmissionStatus;

  @IsOptional()
  @IsDateString()
  repliedAt?: string;
}
