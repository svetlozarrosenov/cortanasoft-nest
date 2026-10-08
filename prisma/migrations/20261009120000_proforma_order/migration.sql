-- Проформа по продажба
ALTER TABLE "proformas" ADD COLUMN "orderId" TEXT;
CREATE INDEX "proformas_orderId_idx" ON "proformas"("orderId");
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
