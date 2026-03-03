import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveStockTransferItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0)
  receivedQty: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  receivedSerialIds?: string[];
}

export class ReceiveStockTransferDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveStockTransferItemDto)
  items: ReceiveStockTransferItemDto[];
}
