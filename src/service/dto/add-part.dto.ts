import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
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

  @IsString()
  @IsOptional()
  inventoryBatchId?: string;

  @IsString()
  @IsOptional()
  inventorySerialId?: string;
}
