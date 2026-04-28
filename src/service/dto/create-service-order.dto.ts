import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import {
  ServiceOrderType,
  ServiceOrderPriority,
  ServiceLocation,
} from '@prisma/client';

export class CreateServiceOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsEnum(ServiceOrderType)
  @IsOptional()
  type?: ServiceOrderType;

  @IsEnum(ServiceOrderPriority)
  @IsOptional()
  priority?: ServiceOrderPriority;

  @IsEnum(ServiceLocation)
  @IsOptional()
  serviceLocation?: ServiceLocation;

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

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsBoolean()
  @IsOptional()
  generatePublicToken?: boolean;
}
