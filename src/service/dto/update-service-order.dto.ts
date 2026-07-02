import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import {
  ServiceOrderType,
  ServiceOrderPriority,
  ServiceLocation,
} from '@prisma/client';

export class UpdateServiceOrderDto {
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

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsBoolean()
  @IsOptional()
  isApprovedByCustomer?: boolean;

  @IsString()
  @IsOptional()
  approvalChannel?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @IsBoolean()
  @IsOptional()
  notifyCustomer?: boolean;
}
