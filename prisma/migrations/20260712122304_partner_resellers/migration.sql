-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "isPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referredById" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "partnerCustomerId" TEXT;

-- AlterTable
ALTER TABLE "user_companies" ADD COLUMN     "partnerCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "customers_companyId_isPartner_idx" ON "customers"("companyId", "isPartner");

-- CreateIndex
CREATE INDEX "customers_referredById_idx" ON "customers"("referredById");

-- CreateIndex
CREATE INDEX "orders_companyId_partnerCustomerId_idx" ON "orders"("companyId", "partnerCustomerId");

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_partnerCustomerId_fkey" FOREIGN KEY ("partnerCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_partnerCustomerId_fkey" FOREIGN KEY ("partnerCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
