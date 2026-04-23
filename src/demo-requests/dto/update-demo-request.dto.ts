import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { DemoRequestStatus } from '@prisma/client';

export class UpdateDemoRequestDto {
  @IsOptional()
  @IsEnum(DemoRequestStatus)
  status?: DemoRequestStatus;

  @IsOptional()
  @IsDateString()
  contactedAt?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
