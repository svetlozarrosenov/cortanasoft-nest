import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAiSettingsDto {
  // Anthropic API ключ; празен string изтрива записания ключ
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
