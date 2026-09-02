import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

// Масова редакция на записи присъствие — само полетата, които има смисъл
// да се задават еднакво на много записи наведнъж
export class BulkUpdateAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];

  // Обект; празен string изчиства връзката, undefined = не се пипа
  @IsString()
  @IsOptional()
  siteId?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;
}
