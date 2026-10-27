import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  ValidateIf,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Клиент, чийто е обектът; null изчиства
  @ValidateIf((o: CreateSiteDto) => o.customerId !== null)
  @IsString()
  @IsOptional()
  customerId?: string | null;

  // Бюджет на обекта (сума без ДДС); null изчиства
  @ValidateIf((o: CreateSiteDto) => o.budget !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  budget?: number | null;

  // Чеклист за посещение — редове текст
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @IsOptional()
  checklist?: string[];
}
