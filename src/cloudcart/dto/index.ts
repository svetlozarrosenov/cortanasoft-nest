import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class SaveCloudCartIntegrationDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
