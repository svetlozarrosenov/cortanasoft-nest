import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HandoverProtocolItemDto {
  @IsString()
  orderItemId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CreateHandoverProtocolDto {
  @IsString()
  orderId: string;

  @IsString()
  receivedByName: string;

  @IsOptional()
  @IsString()
  receivedByPosition?: string;

  @IsOptional()
  @IsString()
  receivedByIdCardNumber?: string;

  @IsOptional()
  @IsDateString()
  protocolDate?: string;

  @IsOptional()
  @IsString()
  handoverLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverProtocolItemDto)
  items: HandoverProtocolItemDto[];
}
