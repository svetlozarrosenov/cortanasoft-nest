import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AttendanceType, AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceType)
  @IsOptional()
  type?: AttendanceType;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  overtimeMinutes?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
