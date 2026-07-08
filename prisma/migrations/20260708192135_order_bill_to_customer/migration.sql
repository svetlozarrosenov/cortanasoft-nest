-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "billToCustomerId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_billToCustomerId_fkey" FOREIGN KEY ("billToCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
