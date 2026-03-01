import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SerialStatus } from '@prisma/client';

export class UpdateInventorySerialDto {
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(SerialStatus)
  status?: SerialStatus;

  @IsOptional()
  @IsString()
  storageZoneId?: string;
}
