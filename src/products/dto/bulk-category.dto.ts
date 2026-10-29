import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

// Масово задаване на категория (тикет #48 Инатех): продуктите от сканирани
// доставки се създават без категория и после се категоризират наведнъж
export class BulkCategoryDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];

  // null = изчистване на категорията на избраните продукти
  @ValidateIf((o: BulkCategoryDto) => o.categoryId !== null)
  @IsString()
  @IsNotEmpty()
  categoryId: string | null;
}
