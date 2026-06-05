import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { NormalizeEmail, TrimEnds } from '../../common/decorators/normalize.decorator';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @TrimEnds()
  @IsString()
  @MinLength(6)
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;
}
