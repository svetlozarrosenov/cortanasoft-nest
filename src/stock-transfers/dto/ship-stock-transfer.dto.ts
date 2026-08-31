import { IsOptional, IsString } from 'class-validator';

export class ShipStockTransferDto {
  // „Предал" за протокола — по подразбиране (без стойност) е текущият потребител
  @IsString()
  @IsOptional()
  handedById?: string;
}
