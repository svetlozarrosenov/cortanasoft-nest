import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class QueryWorkShiftsDto {
  @Matches(DATE)
  from: string;

  @Matches(DATE)
  to: string;

  @IsString()
  @IsOptional()
  siteId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class CreateWorkShiftDto {
  // Незадължителен — смяна без обект
  @IsString()
  @IsOptional()
  siteId?: string;

  // Няколко души на един обект наведнъж (бригада)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  userIds: string[];

  @Matches(DATE)
  date: string;

  @Matches(TIME)
  startTime: string;

  @Matches(TIME)
  endTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;

  // Повтаряй всяка седмица до тази дата (вкл.) — абонаментните обекти
  @Matches(DATE)
  @IsOptional()
  repeatUntil?: string;

  // Дни от седмицата за серията (1 = пон … 7 = нед); по подразбиране — денят на date
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  @Type(() => Number)
  weekdays?: number[];

  // Ротация „N дни работа / M дни почивка" от началната дата (2/2, 4/2, 1/2…).
  // Ако е зададена, weekdays не се гледат.
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  @Type(() => Number)
  rotationWork?: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  @Type(() => Number)
  rotationRest?: number;
}

export class UpdateWorkShiftDto {
  // null изчиства обекта
  @ValidateIf((o: UpdateWorkShiftDto) => o.siteId !== null)
  @IsString()
  @IsOptional()
  siteId?: string | null;

  @IsString()
  @IsOptional()
  userId?: string;

  @Matches(DATE)
  @IsOptional()
  date?: string;

  @Matches(TIME)
  @IsOptional()
  startTime?: string;

  @Matches(TIME)
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string | null;
}

export class ScopeDto {
  // one = само тази смяна; following = тази и следващите от същата серия
  @IsIn(['one', 'following'])
  @IsOptional()
  scope?: 'one' | 'following';
}

export class CopyWeekDto {
  // Понеделник на седмицата-източник и на целевата седмица
  @Matches(DATE)
  fromWeek: string;

  @Matches(DATE)
  toWeek: string;
}
