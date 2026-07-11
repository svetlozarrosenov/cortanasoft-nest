import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Разпределение на едно количество по конкретна партида (ръчно избиране при
// окомплектоване/изписване на поръчка).
export class FulfillBatchAllocationDto {
  @IsString()
  inventoryBatchId: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}

export class FulfillOrderItemDto {
  @IsString()
  orderItemId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillBatchAllocationDto)
  batches: FulfillBatchAllocationDto[];

  // За серийни редове: избраният свободен сериен номер, който се изписва
  // (маркира се SOLD и се закача към реда). batches остава празен масив.
  @IsOptional()
  @IsString()
  inventorySerialId?: string;
}

export class FulfillOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillOrderItemDto)
  items: FulfillOrderItemDto[];
}
