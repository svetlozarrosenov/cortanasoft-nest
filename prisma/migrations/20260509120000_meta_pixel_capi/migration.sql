-- Add Meta Conversions API (CAPI) fields to MetaPixelConfig.
-- accessTokenEncrypted: AES-256-GCM encrypted long-lived System User token from Events Manager.
-- testEventCode: optional code from Test Events tab for verification.

ALTER TABLE "meta_pixel_config" ADD COLUMN "accessTokenEncrypted" TEXT;
ALTER TABLE "meta_pixel_config" ADD COLUMN "testEventCode" TEXT;
