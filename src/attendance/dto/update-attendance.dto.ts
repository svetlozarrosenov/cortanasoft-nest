import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { AttendanceType } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceType)
  @IsOptional()
  type?: AttendanceType;

  // Обект; празен string изчиства връзката
  @IsString()
  @IsOptional()
  siteId?: string;

  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  overtimeMinutes?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
