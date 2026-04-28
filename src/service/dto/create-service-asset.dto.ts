import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ServiceAssetStatus } from '@prisma/client';

export class CreateServiceAssetDto {
  @IsString()
  @IsOptional()
  assetNumber?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  imei?: string;

  @IsString()
  @IsOptional()
  vin?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(ServiceAssetStatus)
  @IsOptional()
  status?: ServiceAssetStatus;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  warrantyId?: string;
}
