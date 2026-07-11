import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePriceListDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
