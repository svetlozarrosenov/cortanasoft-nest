import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateDemoRequestDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(200)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  employeeCount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  // UUID, генериран от browser-а; споделя се с fbq() през { eventID } за CAPI дедупликация.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  metaEventId?: string;
}
