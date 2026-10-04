-- Лог на събитията от Meta Pixel (публичният сайт, само не-логнати посетители).
CREATE TABLE "meta_pixel_events" (
  "id" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventSourceUrl" TEXT,
  "path" TEXT,
  "referrer" TEXT,
  "contentName" TEXT,
  "userEmail" TEXT,
  "userPhone" TEXT,
  "userFirstName" TEXT,
  "userLastName" TEXT,
  "userIp" TEXT,
  "userAgent" TEXT,
  "fbp" TEXT,
  "fbc" TEXT,
  "capiSuccess" BOOLEAN NOT NULL DEFAULT false,
  "capiStatus" INTEGER,
  "capiResponse" TEXT,
  "capiError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meta_pixel_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "meta_pixel_events_eventTime_idx" ON "meta_pixel_events"("eventTime" DESC);
CREATE INDEX "meta_pixel_events_eventName_eventTime_idx" ON "meta_pixel_events"("eventName", "eventTime" DESC);
CREATE INDEX "meta_pixel_events_fbp_eventTime_idx" ON "meta_pixel_events"("fbp", "eventTime" DESC);
CREATE INDEX "meta_pixel_events_userEmail_idx" ON "meta_pixel_events"("userEmail");
CREATE INDEX "meta_pixel_events_eventId_idx" ON "meta_pixel_events"("eventId");
