import {
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateHrSettingsDto {
  @Matches(HHMM, { message: 'workDayStart трябва да е във формат HH:mm' })
  @IsOptional()
  workDayStart?: string;

  @Matches(HHMM, { message: 'workDayEnd трябва да е във формат HH:mm' })
  @IsOptional()
  workDayEnd?: string;

  /** Почивка „от–до" вътре в работния ден; null и за двете = без почивка */
  @ValidateIf((o: UpdateHrSettingsDto) => o.breakStart != null)
  @Matches(HHMM, { message: 'breakStart трябва да е във формат HH:mm' })
  @IsOptional()
  breakStart?: string | null;

  @ValidateIf((o: UpdateHrSettingsDto) => o.breakEnd != null)
  @Matches(HHMM, { message: 'breakEnd трябва да е във формат HH:mm' })
  @IsOptional()
  breakEnd?: string | null;

  /** Допустим недостиг на часове за месеца, преди да се маркира в червено */
  @IsInt()
  @Min(0)
  @Max(480)
  @IsOptional()
  hoursToleranceMinutes?: number;

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
