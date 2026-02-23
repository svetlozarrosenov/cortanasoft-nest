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
} from 'class-validator';
import {
  CustomerType,
  CustomerStage,
  CustomerSource,
  Industry,
  CompanySize,
} from '@prisma/client';

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

  @IsNumber()
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
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

  @IsString()
  @IsOptional()
  assignedToId?: string;
}
