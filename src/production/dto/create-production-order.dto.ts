import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @IsString()
  productId: string;

  // BOM is optional — custom production without a recipe is allowed
  @IsString()
  @IsOptional()
  bomId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  plannedStartDate?: string;

  @IsString()
  @IsOptional()
  plannedEndDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
