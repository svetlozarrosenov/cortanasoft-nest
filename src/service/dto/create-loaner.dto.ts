import { IsString, IsOptional } from 'class-validator';

export class CreateLoanerDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
