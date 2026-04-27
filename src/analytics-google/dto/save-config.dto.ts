import { IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class SaveGoogleAnalyticsConfigDto {
  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(/^G-[A-Z0-9]+$/, {
    message: 'Measurement ID трябва да започва с G- (напр. G-XXXXXXXXXX)',
  })
  measurementId?: string | null;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null && v !== '')
  @Matches(/^\d+$/, { message: 'Property ID трябва да съдържа само цифри' })
  propertyId?: string | null;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null && v !== '')
  @MinLength(50, { message: 'Service Account JSON изглежда невалиден' })
  serviceAccountJson?: string | null;
}
