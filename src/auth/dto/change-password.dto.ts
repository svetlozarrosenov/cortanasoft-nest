import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { TrimEnds } from '../../common/decorators/normalize.decorator';

export class ChangePasswordDto {
  @TrimEnds()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @TrimEnds()
  @IsString()
  @MinLength(8)
  newPassword: string;
}
