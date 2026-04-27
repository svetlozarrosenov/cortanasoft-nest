-- Add measurementId for client-side gtag.js tracking, and make Data API columns nullable
-- so the config can hold either tracking-only, Data-API-only, or both.

ALTER TABLE "google_analytics_config"
  ADD COLUMN "measurementId" TEXT;

ALTER TABLE "google_analytics_config"
  ALTER COLUMN "propertyId" DROP NOT NULL,
  ALTER COLUMN "serviceAccountJsonEncrypted" DROP NOT NULL;
