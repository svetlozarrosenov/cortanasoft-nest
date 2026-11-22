import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(99999)
  quantity: number;

  // Which unit is sold. Required for a product kept by serial number.
  @IsOptional()
  @IsString()
  serialId?: string;
}

export class CreateSaleDto {
  @IsString()
  deviceId: string;

  @IsIn(['CASH', 'CARD'])
  paymentMethod: 'CASH' | 'CARD';

  // Prices are not accepted from the browser: they are read from the products
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  // The amount the cashier's screen showed. The sale is refused if the
  // prices no longer add up to it.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedTotal?: number;
}
