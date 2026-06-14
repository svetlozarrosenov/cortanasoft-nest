-- CreateTable
CREATE TABLE "order_item_batch_allocations" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderItemId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,

    CONSTRAINT "order_item_batch_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_item_batch_allocations_orderItemId_idx" ON "order_item_batch_allocations"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_batch_allocations_inventoryBatchId_idx" ON "order_item_batch_allocations"("inventoryBatchId");

-- AddForeignKey
ALTER TABLE "order_item_batch_allocations" ADD CONSTRAINT "order_item_batch_allocations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocations" ADD CONSTRAINT "order_item_batch_allocations_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
