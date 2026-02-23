-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "currencyId" TEXT,
ADD COLUMN     "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
