import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  UNPAID = 'UNPAID',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  OTHER = 'OTHER',
}

export class CreateLeaveDto {
  @IsEnum(LeaveType)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  days: number;

  // Половин ден — позволено само когато заявката е за един ден
  @IsBoolean()
  @IsOptional()
  halfDay?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  // Номер на документ (напр. болничен лист) — изисква се за болничен
  @IsString()
  @IsOptional()
  @MaxLength(100)
  documentNumber?: string;

  // R2 ключ + име на предварително качен документ
  @IsString()
  @IsOptional()
  attachmentKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  attachmentName?: string;

  // Подаване от името на служител (само за HR/мениджъри)
  @IsString()
  @IsOptional()
  userId?: string;
}
