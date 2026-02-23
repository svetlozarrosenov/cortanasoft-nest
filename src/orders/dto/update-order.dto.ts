import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  orderDate?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingPostalCode?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsNumber()
  @IsOptional()
  shippingCost?: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
