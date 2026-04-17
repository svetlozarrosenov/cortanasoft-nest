-- Offer: richDescription (TipTap JSON for the long prose section rendered in the PDF)
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "richDescription" TEXT;

-- Order: sourceOfferId (unique so one offer produces at most one order)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sourceOfferId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_sourceOfferId_key" ON "orders"("sourceOfferId");

ALTER TABLE "orders" ADD CONSTRAINT "orders_sourceOfferId_fkey"
    FOREIGN KEY ("sourceOfferId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
