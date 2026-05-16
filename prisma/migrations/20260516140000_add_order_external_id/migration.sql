-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_companyId_externalId_key" ON "orders"("companyId", "externalId");
