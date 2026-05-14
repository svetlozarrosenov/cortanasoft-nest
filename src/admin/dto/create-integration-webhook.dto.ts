import { IsArray, IsBoolean, IsOptional, IsString, IsUrl, MinLength, IsIn } from 'class-validator';

// Whitelist of event names the dispatcher knows how to emit. Keep in sync
// with the call sites (currently goods-receipts.service.ts emits
// `stock.changed`).
export const ALLOWED_WEBHOOK_EVENTS = [
  'stock.changed',
  'order.status_changed',
] as const;

export class CreateIntegrationWebhookDto {
  @IsString()
  provider: string; // e.g. "shop", "electric-express"

  @IsUrl({ require_tld: false })
  webhookUrl: string;

  // HMAC shared secret. The shop side stores this in its
  // `cortanaWebhookSecret` setting and uses it to verify incoming
  // requests. Anything ≥ 16 chars; 32+ recommended.
  @IsString()
  @MinLength(16)
  secret: string;

  @IsArray()
  @IsString({ each: true })
  @IsIn(ALLOWED_WEBHOOK_EVENTS as unknown as string[], { each: true })
  events: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
