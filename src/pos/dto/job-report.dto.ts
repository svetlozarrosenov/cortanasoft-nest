import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class JobProgressDto {
  @IsString()
  @MaxLength(40)
  stage: string;
}

export class JobResultDto {
  @IsIn(['SUCCEEDED', 'FAILED', 'UNCLEAR'])
  status: 'SUCCEEDED' | 'FAILED' | 'UNCLEAR';

  @IsOptional()
  @IsInt()
  receiptNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  receiptDateTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fiscalMemoryNumber?: string;

  // Card slip data: scheme, masked number, authorisation code, reference
  @IsOptional()
  @IsObject()
  card?: Record<string, string>;

  // The receipt as the fiscal module recorded it in its electronic journal,
  // line by line: the copy kept with the sale
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  receiptText?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;
}

export class DeviceSaleItemDto {
  @IsString()
  productId: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(99999)
  quantity: number;

  // Price without VAT the register sold at (as synced, or keyed in)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate: number;
}

// A sale rung up and printed on the register itself, reported afterwards
export class DeviceSaleDto {
  // Chosen by the register; makes a repeated report harmless
  @IsString()
  @MaxLength(64)
  saleId: string;

  @IsIn(['CASH', 'CARD'])
  paymentMethod: 'CASH' | 'CARD';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  total: number;

  @IsInt()
  receiptNumber: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  receiptDateTime?: string;

  // When the sale happened: a register that was offline reports it later
  @IsOptional()
  @IsISO8601()
  soldAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  fiscalMemoryNumber?: string;

  @IsOptional()
  @IsObject()
  card?: Record<string, string>;

  // The receipt as the fiscal module recorded it in its electronic journal,
  // line by line: the copy kept with the sale
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  receiptText?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeviceSaleItemDto)
  items: DeviceSaleItemDto[];
}
