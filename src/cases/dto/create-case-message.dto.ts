import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCaseMessageDto {
  @IsString()
  @MinLength(1)
  body: string;

  // true = отговор към клиента (вижда се на публичната страница)
  // false = вътрешна бележка (само за екипа)
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
