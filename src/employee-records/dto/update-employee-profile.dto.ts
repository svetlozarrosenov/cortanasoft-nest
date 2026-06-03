import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateEmployeeProfileDto {
  // ЕГН (10 цифри). Празен низ изчиства съхранената стойност.
  @IsOptional()
  @IsString()
  @Matches(/^(\d{10})?$/, { message: 'ЕГН трябва да е 10 цифри' })
  egn?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  personalAddress?: string;

  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @IsOptional()
  @IsString()
  hireDate?: string;
}
