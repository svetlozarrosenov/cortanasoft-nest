import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize.decorator';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
