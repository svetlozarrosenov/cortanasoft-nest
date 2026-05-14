import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

// Single "Custom Website" integration per company. The admin enters:
//   - friendly name (free-form)
//   - shop domain (full https://… URL — we use it to build the webhook URL
//     and to call shop's pull endpoints)
//   - HMAC secret shared with shop. Used in BOTH directions:
//       cortana → shop (outbound webhooks): we sign the body
//       cortana → shop (pull GET requests): we sign method+path+timestamp
//       shop verifies both with the same secret.
export class SaveCustomWebsiteDto {
  @IsString()
  name: string;

  @IsUrl({ require_tld: false })
  domain: string;

  @IsString()
  @IsOptional()
  @MinLength(16)
  secret?: string; // optional on UPDATE — empty means "keep the existing one"

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
