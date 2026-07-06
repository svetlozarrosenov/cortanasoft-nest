import { IsString, MinLength } from 'class-validator';
import { TrimEnds } from '../../common/decorators/normalize.decorator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @TrimEnds()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
