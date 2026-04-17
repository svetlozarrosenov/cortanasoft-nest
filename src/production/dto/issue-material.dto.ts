import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class IssueMaterialDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
