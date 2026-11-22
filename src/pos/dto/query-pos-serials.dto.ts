import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryPosSerialsDto {
  // The register that will print the sale: its store is where units are taken from
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  // An exact serial number, as scanned from the box
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;
}
