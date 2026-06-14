import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Ръчно избрана партида + количество за материал при старт на производство.
export class StartMaterialBatchDto {
  @IsString()
  inventoryBatchId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class StartMaterialDto {
  @IsString()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StartMaterialBatchDto)
  batches: StartMaterialBatchDto[];
}

// По избор: ръчно разпределение на партидите за вложените материали. Ако липсва
// (или е празно) → старт-ът тегли по автоматично FIFO, както досега.
export class StartProductionDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StartMaterialDto)
  materials?: StartMaterialDto[];
}
