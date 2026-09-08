import {
  IsArray,
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { AttendanceType } from '@prisma/client';

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

  @IsString()
  @IsOptional()
  userId?: string; // Задължителен (или userIds) — бекендът не подразбира текущия потребител

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

  // При няколко дни (dates/dateTo): едни и същи часове „от–до" за всеки
  // ден, като час от денонощието по българско време ("08:00"). Бекендът
  // ги превръща в конкретен момент за всяка дата. Трябват и двата.
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  @IsOptional()
  startTime?: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  @IsOptional()
  endTime?: string;

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
