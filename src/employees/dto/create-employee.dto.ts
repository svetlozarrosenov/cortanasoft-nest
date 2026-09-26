import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NormalizeEmail, TrimEnds } from '../../common/decorators/normalize.decorator';

/**
 * Служител без достъп, създаден от самата фирма (HR > Служители).
 * Няма имейл за вход и парола — сървърът ги генерира и никой не ги знае;
 * loginEnabled=false се слага тук, не идва от клиента. Служебният имейл е
 * само информация, уникална в рамките на фирмата.
 */
export class CreateEmployeeDto {
  @TrimEnds()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string;

  @TrimEnds()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @NormalizeEmail()
  @IsEmail()
  @IsOptional()
  workEmail?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsDateString()
  @IsOptional()
  hireDate?: string;
}

export class LeaveEmployeeDto {
  // Дата на напускане — само за информация (видимостта се води по isActive)
  @IsDateString()
  @IsOptional()
  leftAt?: string;
}

/**
 * Личните данни (имена, телефон) са редактируеми от фирмата само за служител
 * без достъп; за потребител с достъп идват от Администрация. Служебният
 * имейл и датата на постъпване са по фирма и се редактират винаги.
 * Празен низ = изчистване.
 */
export class UpdateEmployeePersonalDto {
  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  middleName?: string;

  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @TrimEnds()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @NormalizeEmail()
  @ValidateIf((_, v) => v !== '')
  @IsEmail()
  @IsOptional()
  workEmail?: string;

  @ValidateIf((_, v) => v !== '')
  @IsDateString()
  @IsOptional()
  hireDate?: string;
}
