import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ServiceOrderPriority } from '@prisma/client';

export class UpdateServiceOrderDto {
  @IsEnum(ServiceOrderPriority)
  @IsOptional()
  priority?: ServiceOrderPriority;

  @IsDateString()
  @IsOptional()
  promisedAt?: string;

  @IsString()
  @IsOptional()
  customerComplaint?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  workPerformed?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsString()
  @IsOptional()
  accessories?: string;

  @IsString()
  @IsOptional()
  cosmeticState?: string;

  @IsString()
  @IsOptional()
  declaredFault?: string;

  @IsString()
  @IsOptional()
  technicianId?: string;

  @IsString()
  @IsOptional()
  assetId?: string;
}
