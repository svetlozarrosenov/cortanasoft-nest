import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^(\d{9}|\d{13})$/, { message: 'ЕИК трябва да е 9 или 13 цифри' })
  eik?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  vatNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  contactName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(34)
  iban?: string;

  @IsString()
  @IsOptional()
  @MaxLength(11)
  bic?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentTerms?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
