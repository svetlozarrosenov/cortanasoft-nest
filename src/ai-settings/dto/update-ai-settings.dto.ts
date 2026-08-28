import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Курираният списък модели — всичко тук е тествано с нашите заявки
// (vision + PDF + tool use). Свободен string не се приема.
export const ALLOWED_AI_MODELS = [
  'claude-haiku-4-5',
  'claude-sonnet-5',
  'claude-opus-5',
] as const;

export const DEFAULT_AI_MODEL = 'claude-haiku-4-5';

export class UpdateAiSettingsDto {
  // Anthropic API ключ; празен string изтрива записания ключ
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiKey?: string;

  @IsOptional()
  @IsIn(ALLOWED_AI_MODELS)
  model?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
