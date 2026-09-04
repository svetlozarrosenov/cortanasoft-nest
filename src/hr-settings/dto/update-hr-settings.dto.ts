import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateHrSettingsDto {
  @Matches(HHMM, { message: 'workDayStart трябва да е във формат HH:mm' })
  @IsOptional()
  workDayStart?: string;

  @Matches(HHMM, { message: 'workDayEnd трябва да е във формат HH:mm' })
  @IsOptional()
  workDayEnd?: string;

  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  breakMinutes?: number;

  /** Дни платен отпуск по подразбиране за служител без индивидуална стойност */
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  annualLeaveDays?: number;

  /** Колко дни назад HR може да въвежда отсъствие (0 = без ограничение) */
  @IsInt()
  @Min(0)
  @Max(3650)
  @IsOptional()
  leaveMaxBackdateDays?: number;

  /** Минимално предизвестие в календарни дни за платен отпуск от служител (0 = няма) */
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  leaveMinNoticeDays?: number;
}
