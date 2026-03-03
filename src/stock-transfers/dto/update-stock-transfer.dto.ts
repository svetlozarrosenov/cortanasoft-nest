import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStockTransferItemDto } from './create-stock-transfer.dto';

export class UpdateStockTransferDto {
  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @IsString()
  @IsOptional()
  fromLocationId?: string;

  @IsString()
  @IsOptional()
  toLocationId?: string;

  @IsString()
  @IsOptional()
  responsibleId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items?: CreateStockTransferItemDto[];
}
