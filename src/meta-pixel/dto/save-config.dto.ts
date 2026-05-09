import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveMetaPixelConfigDto {
  @IsString()
  @MinLength(20, { message: 'Скриптът от Meta изглежда твърде къс или невалиден' })
  scriptHtml!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // CAPI: long-lived System User access token от Meta Events Manager.
  // При празно/липсващо в payload-а, съществуващият (ако има) се запазва.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  accessToken?: string;

  // Optional code от Test Events tab — за верификация в Events Manager.
  // Празен string или null изтрива съществуващия.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  testEventCode?: string | null;
}
