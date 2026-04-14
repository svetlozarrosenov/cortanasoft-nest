import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class SaveWordPressIntegrationDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsIn(['test', 'live'])
  @IsOptional()
  mode?: 'test' | 'live';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
