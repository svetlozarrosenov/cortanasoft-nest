import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateContactSubmissionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MaxLength(50)
  subject: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  // UUID, генериран от browser-а; споделя се с fbq() през { eventID } за CAPI дедупликация.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  metaEventId?: string;
}
