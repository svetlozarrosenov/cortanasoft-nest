import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import {
  CustomerType,
  CustomerStage,
  CustomerSource,
  Industry,
  CompanySize,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  // Company info
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  eik?: string;

  @IsString()
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @IsOptional()
  molName?: string;

  // Individual info
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  // Contact info
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  // Address
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

  // Bank info
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  iban?: string;

  @IsString()
  @IsOptional()
  bic?: string;

  // Additional
  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Кредитният лимит трябва да бъде число.' })
  @Min(0, { message: 'Кредитният лимит не може да бъде отрицателен.' })
  creditLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Отстъпката трябва да бъде число.' })
  @Min(0, { message: 'Отстъпката не може да бъде отрицателна.' })
  @Max(100, { message: 'Отстъпката не може да бъде повече от 100%.' })
  discount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // CRM fields
  @IsEnum(CustomerStage)
  @IsOptional()
  stage?: CustomerStage;

  @IsEnum(CustomerSource)
  @IsOptional()
  source?: CustomerSource;

  @IsEnum(Industry)
  @IsOptional()
  industry?: Industry;

  @IsEnum(CompanySize)
  @IsOptional()
  size?: CompanySize;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // Ключови думи за търсене (търговски имена/псевдоними) — виж schema.prisma
  @IsString()
  @IsOptional()
  searchTerms?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  // Партньор (прекупвач) — виж коментара в schema.prisma при Customer
  @IsBoolean()
  @IsOptional()
  isPartner?: boolean;

  // Партньорът, довел този клиент. Празен стринг/null = без партньор.
  @ValidateIf((o) => o.referredById !== null)
  @IsString()
  @IsOptional()
  referredById?: string | null;
}
