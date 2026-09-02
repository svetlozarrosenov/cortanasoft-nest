import {
  IsArray,
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AttendanceType, AttendanceStatus } from '@prisma/client';

export class CreateAttendanceDto {
  @IsDateString()
  date: string;

  // Край на период „от–до": разгъва се в дневни записи (само работни дни,
  // без одобрени отпуски). Без стойност = единичен запис за date.
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  // Обект, на който е било присъствието
  @IsString()
  @IsOptional()
  siteId?: string;

  // При период: включва и събота/неделя/празници (извънреден труд).
  // По подразбиране неработните дни се прескачат.
  @IsBoolean()
  @IsOptional()
  includeNonWorkingDays?: boolean;

  // Изрично избрани дни (от чиповете в UI-а) — имат превес над dateTo
  // периода: създава се запис за ВСЕКИ подаден ден, вкл. почивен/празничен.
  @IsArray()
  @IsDateString({}, { each: true })
  @IsOptional()
  dates?: string[];

  @IsEnum(AttendanceType)
  @IsOptional()
  type?: AttendanceType;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  userId?: string; // If not provided, defaults to current user

  // Няколко служители наведнъж (бригада на един обект) — има превес над userId
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

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
