import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Задава/обновява цената на продукт в листата (upsert по [listId, productId])
export class UpsertPriceListItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}
