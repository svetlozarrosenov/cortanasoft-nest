-- Доставката като ред: куриерски продукт (услуга, вързана за Еконт/Спиди),
-- чернова на пратката по продажбата и „кой плаща" в пратката.
ALTER TABLE "products" ADD COLUMN "courierProvider" TEXT;
CREATE UNIQUE INDEX "products_companyId_courierProvider_key" ON "products"("companyId", "courierProvider");
ALTER TABLE "orders" ADD COLUMN "speedySiteId" INTEGER;
ALTER TABLE "orders" ADD COLUMN "speedyOfficeId" INTEGER;
ALTER TABLE "orders" ADD COLUMN "speedyOfficeName" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipmentWeight" DECIMAL(10,3);
ALTER TABLE "orders" ADD COLUMN "shipmentPackCount" INTEGER;
ALTER TABLE "shipments" ADD COLUMN "payer" TEXT NOT NULL DEFAULT 'sender';
