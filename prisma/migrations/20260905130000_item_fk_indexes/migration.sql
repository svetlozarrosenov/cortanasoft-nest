-- CreateIndex
CREATE INDEX "goods_receipt_items_goodsReceiptId_idx" ON "goods_receipt_items"("goodsReceiptId");

-- CreateIndex
CREATE INDEX "goods_receipt_items_productId_idx" ON "goods_receipt_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_batches_goodsReceiptItemId_idx" ON "inventory_batches"("goodsReceiptItemId");

-- CreateIndex
CREATE INDEX "inventory_serials_goodsReceiptItemId_idx" ON "inventory_serials"("goodsReceiptItemId");

-- CreateIndex
CREATE INDEX "invoice_items_orderItemId_idx" ON "invoice_items"("orderItemId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_inventoryBatchId_idx" ON "order_items"("inventoryBatchId");

-- CreateIndex
CREATE INDEX "order_items_inventorySerialId_idx" ON "order_items"("inventorySerialId");

