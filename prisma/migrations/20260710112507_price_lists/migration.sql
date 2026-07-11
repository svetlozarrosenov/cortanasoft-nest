-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "priceListId" TEXT;

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "priceListId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_lists_companyId_idx" ON "price_lists"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_companyId_name_key" ON "price_lists"("companyId", "name");

-- CreateIndex
CREATE INDEX "price_list_items_productId_idx" ON "price_list_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "price_list_items_priceListId_productId_key" ON "price_list_items"("priceListId", "productId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
