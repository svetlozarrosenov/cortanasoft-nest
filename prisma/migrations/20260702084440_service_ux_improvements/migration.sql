-- AlterTable
ALTER TABLE "issued_warranties" ADD COLUMN     "serviceOrderId" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "estimatedCost" DECIMAL(12,2),
ADD COLUMN     "notifyCustomer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "slaNotifiedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "issued_warranties" ADD CONSTRAINT "issued_warranties_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
