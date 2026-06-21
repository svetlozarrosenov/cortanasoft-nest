import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateContractTemplateDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
