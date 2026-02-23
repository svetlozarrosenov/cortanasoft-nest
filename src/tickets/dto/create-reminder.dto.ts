import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum ReminderRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export class CreateReminderDto {
  @IsDateString()
  remindAt: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  userId?: string; // If not provided, reminder is for current user

  // Recurrence settings
  @IsOptional()
  @IsEnum(ReminderRecurrence)
  recurrence?: ReminderRecurrence;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  intervalDays?: number; // For CUSTOM recurrence

  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string; // When to stop recurring (null = infinite)

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  recurrenceCount?: number; // Or number of times to repeat (null = infinite)
}
