import { IsOptional, IsString, MaxLength } from 'class-validator';

// Редактируеми части на welcome имейла — само за конкретното изпращане
export class WelcomeEmailPartsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  greeting?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  intro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;
}

export class SendWelcomeEmailDto extends WelcomeEmailPartsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;
}
