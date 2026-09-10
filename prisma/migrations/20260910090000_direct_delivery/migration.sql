-- Директна доставка (drop-ship): продажба, чиято стока отива от доставчика
-- право при клиента, без да минава през наш склад.

-- AlterTable: ред от поръчка
ALTER TABLE "order_items"
  ADD COLUMN "directDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "unitCost" DECIMAL(10,2);

-- AlterTable: доставка — локацията става незадължителна (null само при directDelivery)
ALTER TABLE "goods_receipts"
  ALTER COLUMN "locationId" DROP NOT NULL,
  ADD COLUMN "directDelivery" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "orderId" TEXT;

-- Prisma пресъздава FK-то при optional relation; дефиницията е същата (RESTRICT)
ALTER TABLE "goods_receipts" DROP CONSTRAINT "goods_receipts_locationId_fkey";
ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "goods_receipts_orderId_idx" ON "goods_receipts"("orderId");
