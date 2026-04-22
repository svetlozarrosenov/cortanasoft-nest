-- Add enableReviewStatus flag to Company. Default TRUE so existing tenants
-- keep the IN_REVIEW workflow step unchanged. Tenants that don't want review
-- can opt out from settings UI.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "enableReviewStatus" BOOLEAN NOT NULL DEFAULT true;
