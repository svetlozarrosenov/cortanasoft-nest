-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "inventorySerialId" TEXT;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
