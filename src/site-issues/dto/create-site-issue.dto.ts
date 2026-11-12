import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SiteIssueItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  // Изрично избрана партида; без нея — автоматично (FEFO/FIFO)
  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  // Само за серийни продукти: един ред = един номер
  @IsString()
  @IsOptional()
  inventorySerialId?: string;
}

export class CreateSiteIssueDto {
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsDateString()
  @IsOptional()
  issueDate?: string;

  // Кой е изписал стоката; без стойност = текущият потребител
  @IsString()
  @IsOptional()
  issuedById?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SiteIssueItemDto)
  items: SiteIssueItemDto[];

  // true = запиши и изпиши веднага (без междинна чернова)
  @IsBoolean()
  @IsOptional()
  issue?: boolean;
}
