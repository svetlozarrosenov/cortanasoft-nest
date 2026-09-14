-- Дропшип заявка към доставчик: кога е изпратена (null = чака доставчик/цени)
ALTER TABLE "goods_receipts" ADD COLUMN "sentToSupplierAt" TIMESTAMP(3);
