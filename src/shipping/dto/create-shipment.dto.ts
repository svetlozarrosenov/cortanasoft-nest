import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsIn,
  Min,
} from 'class-validator';
import { DeliveryType } from '@prisma/client';

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  @IsIn(['econt', 'speedy'])
  provider?: string;

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  // Получател
  @IsString()
  receiverName: string;

  @IsString()
  receiverPhone: string;

  // Офис (Econt)
  @IsString()
  @IsOptional()
  officeCode?: string;

  @IsString()
  @IsOptional()
  officeName?: string;

  // Офис (Speedy)
  @IsInt()
  @IsOptional()
  speedyOfficeId?: number;

  @IsInt()
  @IsOptional()
  speedySiteId?: number;

  // Адрес
  @IsString()
  @IsOptional()
  addressCity?: string;

  @IsString()
  @IsOptional()
  addressPostCode?: string;

  @IsString()
  @IsOptional()
  addressStreet?: string;

  @IsString()
  @IsOptional()
  addressNum?: string;

  @IsString()
  @IsOptional()
  addressOther?: string;

  // Package
  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  packCount?: number;

  @IsNumber()
  @IsOptional()
  dimensionsL?: number;

  @IsNumber()
  @IsOptional()
  dimensionsW?: number;

  @IsNumber()
  @IsOptional()
  dimensionsH?: number;

  @IsString()
  @IsOptional()
  description?: string;

  // COD
  @IsNumber()
  @IsOptional()
  @Min(0)
  codAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class CalculateShippingDto {
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  // Econt office
  @IsString()
  @IsOptional()
  officeCode?: string;

  // Speedy office/site
  @IsInt()
  @IsOptional()
  speedyOfficeId?: number;

  @IsInt()
  @IsOptional()
  speedySiteId?: number;

  // Address
  @IsString()
  @IsOptional()
  addressCity?: string;

  @IsString()
  @IsOptional()
  addressPostCode?: string;

  @IsString()
  @IsOptional()
  addressStreet?: string;

  @IsString()
  @IsOptional()
  addressNum?: string;

  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  packCount?: number;

  @IsNumber()
  @IsOptional()
  dimensionsL?: number;

  @IsNumber()
  @IsOptional()
  dimensionsW?: number;

  @IsNumber()
  @IsOptional()
  dimensionsH?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  codAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
