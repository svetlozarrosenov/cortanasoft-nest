-- Частта в сервизна заявка е или от склада, или донесена от клиента.
-- „Поръчка“ отпада: частта се добавя, когато вече е в склада (през доставка).
-- Съществуващите редове „за поръчка“ стават „от склад“ — при предаване ще
-- поискат партида/сериен номер като всяка складова част.
BEGIN;
UPDATE "service_order_parts" SET "source" = 'STOCK' WHERE "source" = 'PURCHASE';
CREATE TYPE "ServicePartSource_new" AS ENUM ('STOCK', 'CUSTOMER');
ALTER TABLE "service_order_parts" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "service_order_parts" ALTER COLUMN "source" TYPE "ServicePartSource_new" USING ("source"::text::"ServicePartSource_new");
ALTER TYPE "ServicePartSource" RENAME TO "ServicePartSource_old";
ALTER TYPE "ServicePartSource_new" RENAME TO "ServicePartSource";
DROP TYPE "ServicePartSource_old";
ALTER TABLE "service_order_parts" ALTER COLUMN "source" SET DEFAULT 'STOCK';
COMMIT;
