-- Собствен идентификатор на посетителя (cs_vid) — независим от _fbp.
ALTER TABLE "meta_pixel_events" ADD COLUMN "visitorId" TEXT;
CREATE INDEX "meta_pixel_events_visitorId_eventTime_idx" ON "meta_pixel_events"("visitorId", "eventTime" DESC);
