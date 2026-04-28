import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SaveMetaPixelConfigDto {
  @IsString()
  @MinLength(20, { message: 'Скриптът от Meta изглежда твърде къс или невалиден' })
  scriptHtml!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
