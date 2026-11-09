import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ServiceOrderPriority } from '@prisma/client';

export class CreateServiceOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsEnum(ServiceOrderPriority)
  @IsOptional()
  priority?: ServiceOrderPriority;

  @IsDateString()
  @IsOptional()
  receivedAt?: string;

  @IsDateString()
  @IsOptional()
  promisedAt?: string;

  @IsString()
  customerComplaint: string;

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
  internalNotes?: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  assetId?: string;

  @IsString()
  @IsOptional()
  technicianId?: string;
}
