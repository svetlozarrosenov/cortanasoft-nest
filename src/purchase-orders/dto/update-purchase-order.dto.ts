import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsDateString()
  @IsOptional()
  orderDate?: string;

  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
