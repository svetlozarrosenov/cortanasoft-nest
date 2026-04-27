-- Google Analytics: singleton config for GA4 integration (OWNER company only).

CREATE TABLE "google_analytics_config" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "serviceAccountJsonEncrypted" TEXT NOT NULL,
    "serviceAccountEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_analytics_config_pkey" PRIMARY KEY ("id")
);
