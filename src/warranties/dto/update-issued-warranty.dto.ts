import { IsOptional, IsString, IsEnum } from 'class-validator';
import { IssuedWarrantyStatus } from '@prisma/client';

export class UpdateIssuedWarrantyDto {
  @IsOptional()
  @IsEnum(IssuedWarrantyStatus)
  status?: IssuedWarrantyStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
