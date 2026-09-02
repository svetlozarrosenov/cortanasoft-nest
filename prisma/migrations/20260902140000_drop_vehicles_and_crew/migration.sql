-- Бусовете (VEHICLE) стават обикновени складове преди премахването на
-- стойността от enum-а — иначе ALTER TYPE ... USING се проваля.
UPDATE "locations" SET "type" = 'WAREHOUSE' WHERE "type" = 'VEHICLE';

-- AlterEnum
BEGIN;
CREATE TYPE "LocationType_new" AS ENUM ('WAREHOUSE', 'STORE');
ALTER TABLE "locations" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "locations" ALTER COLUMN "type" TYPE "LocationType_new" USING ("type"::text::"LocationType_new");
ALTER TYPE "LocationType" RENAME TO "LocationType_old";
ALTER TYPE "LocationType_new" RENAME TO "LocationType";
DROP TYPE "LocationType_old";
ALTER TABLE "locations" ALTER COLUMN "type" SET DEFAULT 'WAREHOUSE';
COMMIT;

-- DropForeignKey
ALTER TABLE "expense_crew_members" DROP CONSTRAINT "expense_crew_members_expenseId_fkey";

-- DropForeignKey
ALTER TABLE "expense_crew_members" DROP CONSTRAINT "expense_crew_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_locationId_fkey";

-- DropForeignKey
ALTER TABLE "location_members" DROP CONSTRAINT "location_members_locationId_fkey";

-- DropForeignKey
ALTER TABLE "location_members" DROP CONSTRAINT "location_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "order_crew_members" DROP CONSTRAINT "order_crew_members_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_crew_members" DROP CONSTRAINT "order_crew_members_userId_fkey";

-- DropIndex
DROP INDEX "expenses_locationId_idx";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "expense_crew_members";

-- DropTable
DROP TABLE "location_members";

-- DropTable
DROP TABLE "order_crew_members";

