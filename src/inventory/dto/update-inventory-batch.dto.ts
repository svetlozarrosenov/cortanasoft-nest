import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateInventoryBatchDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsOptional()
  @IsString()
  storageZoneId?: string;
}
