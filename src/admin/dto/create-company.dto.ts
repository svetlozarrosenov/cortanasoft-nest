import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  Matches,
  Length,
} from 'class-validator';
import { CompanyRole } from '@prisma/client';

export class CreateCompanyDto {
  // Основна информация
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(9, 13)
  @Matches(/^\d{9}(\d{4})?$/, { message: 'ЕИК трябва да е 9 или 13 цифри' })
  eik: string;

  @IsString()
  @IsOptional()
  @Matches(/^BG\d{9,13}$/, {
    message: 'ДДС номер трябва да започва с BG и да съдържа 9-13 цифри',
  })
  vatNumber?: string;

  // Адрес
  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsOptional()
  settlementId?: string;

  // МОЛ
  @IsString()
  @IsOptional()
  molName?: string;

  // Контакти
  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  // Банкова информация
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{14}$/, {
    message: 'Невалиден IBAN формат',
  })
  iban?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'Невалиден BIC/SWIFT код',
  })
  bic?: string;

  // Валута по подразбиране
  @IsString()
  @IsOptional()
  currencyId?: string;

  // Настройки за функционалност
  @IsBoolean()
  @IsOptional()
  pushNotificationsEnabled?: boolean;

  // Системни полета
  @IsEnum(CompanyRole)
  @IsOptional()
  role?: CompanyRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
