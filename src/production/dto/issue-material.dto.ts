import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StartMaterialBatchDto } from './start-production.dto';

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

  // По избор: от кои партиди се взима материалът. Сумата трябва да е равна на
  // quantity. Ако липсва → FIFO (най-старите партиди първи).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StartMaterialBatchDto)
  batches?: StartMaterialBatchDto[];
}
