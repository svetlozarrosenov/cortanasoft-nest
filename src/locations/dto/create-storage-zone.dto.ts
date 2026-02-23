import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateStorageZoneDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
