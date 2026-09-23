import { IsString, Length, Matches } from 'class-validator';
import { TrimEnds } from '../../common/decorators/normalize.decorator';

export class VerifyTwoFactorDto {
  @IsString()
  challengeId: string;

  // 6 цифри от приложението за автентикация (интервали се търпят)
  @TrimEnds()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
