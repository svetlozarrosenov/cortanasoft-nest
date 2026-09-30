-- Очаквана дата на товарене на доставката (Склад > Доставки), с подредба по нея
ALTER TABLE "goods_receipts" ADD COLUMN "expectedShipDate" TIMESTAMP(3);
CREATE INDEX "goods_receipts_companyId_expectedShipDate_idx" ON "goods_receipts"("companyId", "expectedShipDate");
