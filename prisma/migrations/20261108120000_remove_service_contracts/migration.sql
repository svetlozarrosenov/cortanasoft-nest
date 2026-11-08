-- AlterEnum
BEGIN;
CREATE TYPE "ServiceOrderType_new" AS ENUM ('WARRANTY', 'PAID', 'GOODWILL');
ALTER TABLE "service_orders" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "service_orders" ALTER COLUMN "type" TYPE "ServiceOrderType_new" USING ("type"::text::"ServiceOrderType_new");
ALTER TYPE "ServiceOrderType" RENAME TO "ServiceOrderType_old";
ALTER TYPE "ServiceOrderType_new" RENAME TO "ServiceOrderType";
DROP TYPE "ServiceOrderType_old";
ALTER TABLE "service_orders" ALTER COLUMN "type" SET DEFAULT 'PAID';
COMMIT;

-- DropForeignKey
ALTER TABLE "service_contracts" DROP CONSTRAINT "service_contracts_companyId_fkey";

-- DropForeignKey
ALTER TABLE "service_contracts" DROP CONSTRAINT "service_contracts_customerId_fkey";

-- DropForeignKey
ALTER TABLE "service_orders" DROP CONSTRAINT "service_orders_contractId_fkey";

-- AlterTable
ALTER TABLE "service_orders" DROP COLUMN "contractId";

-- DropTable
DROP TABLE "service_contracts";

-- DropEnum
DROP TYPE "ServiceContractStatus";

