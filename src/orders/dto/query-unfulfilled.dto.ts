import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// Филтри за „Очакват изписване" — summary-то е винаги по пълния набор,
// само редовете се филтрират и странират.
export class QueryUnfulfilledDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ready', 'awaiting-stock'])
  readiness?: 'ready' | 'awaiting-stock';

  @IsOptional()
  @IsIn(['PAID', 'PARTIAL', 'PENDING'])
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
