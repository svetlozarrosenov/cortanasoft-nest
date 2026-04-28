import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceOrderStatus } from '@prisma/client';

export class ChangeServiceOrderStatusDto {
  @IsEnum(ServiceOrderStatus)
  status: ServiceOrderStatus;

  @IsString()
  @IsOptional()
  note?: string;
}
