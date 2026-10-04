import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateCustomerContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  position?: string;

  // Формата праща '' за празно поле — сървърът го пази като null
  @ValidateIf((o: CreateCustomerContactDto) => !!o.email)
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
