-- DropIndex
DROP INDEX "service_orders_publicToken_key";

-- AlterTable
ALTER TABLE "service_orders" DROP COLUMN "publicToken";

