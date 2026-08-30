-- AlterTable
ALTER TABLE "production_orders" ADD COLUMN     "outputBatchId" TEXT;

-- CreateIndex
CREATE INDEX "production_orders_outputBatchId_idx" ON "production_orders"("outputBatchId");

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_outputBatchId_fkey" FOREIGN KEY ("outputBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: съществуващите партиди сочат производството си през
-- inventory_batches.productionOrderId — обръщаме връзката, за да могат
-- бъдещите доливания (много поръчки → една партида) да се проследяват.
UPDATE "production_orders" po
SET "outputBatchId" = ib.id
FROM "inventory_batches" ib
WHERE ib."productionOrderId" = po.id
  AND po."outputBatchId" IS NULL;
