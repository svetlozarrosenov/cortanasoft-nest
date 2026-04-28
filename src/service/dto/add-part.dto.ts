import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { ServicePartSource } from '@prisma/client';

export class AddServicePartDto {
  @IsString()
  productId: string;

  @IsEnum(ServicePartSource)
  @IsOptional()
  source?: ServicePartSource;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsBoolean()
  @IsOptional()
  isWarranty?: boolean;

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsString()
  @IsOptional()
  inventorySerialId?: string;
}
