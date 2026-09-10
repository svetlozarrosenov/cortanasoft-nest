import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// Отчети > Клиенти > „Задължения": търсене по име + сървърна пагинация.
// Без период — задължението е салдо към момента, не се влияе от датите.
export class QueryCustomerReceivablesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
