-- Meta Pixel singleton config — stores the full <script> blob copied from Meta Events Manager.
-- Used by the public site to inject the pixel into <head>.

CREATE TABLE "meta_pixel_config" (
    "id" TEXT NOT NULL,
    "scriptHtml" TEXT NOT NULL,
    "pixelId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_pixel_config_pkey" PRIMARY KEY ("id")
);
