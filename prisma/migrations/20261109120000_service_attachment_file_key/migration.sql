-- Прикачените файлове на сервизната заявка се качват в R2 (частен bucket)
-- и се сервират през бекенда. Външният URL остава само за старите записи.
ALTER TABLE "service_order_attachments" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "service_order_attachments" ADD COLUMN "fileKey" TEXT;
ALTER TABLE "service_order_attachments" ADD COLUMN "fileSize" INTEGER;
