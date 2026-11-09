-- Сервизът става само гаранционен: без оферта/одобрение от клиента. Старите
-- статуси AWAITING_QUOTE / AWAITING_APPROVAL (и в историята) стават IN_REPAIR.
-- AlterEnum
BEGIN;
UPDATE "service_orders" SET "status" = 'IN_REPAIR' WHERE "status" IN ('AWAITING_QUOTE', 'AWAITING_APPROVAL');
UPDATE "service_order_status_history" SET "fromStatus" = 'IN_REPAIR' WHERE "fromStatus" IN ('AWAITING_QUOTE', 'AWAITING_APPROVAL');
UPDATE "service_order_status_history" SET "toStatus" = 'IN_REPAIR' WHERE "toStatus" IN ('AWAITING_QUOTE', 'AWAITING_APPROVAL');
CREATE TYPE "ServiceOrderStatus_new" AS ENUM ('NEW', 'DIAGNOSING', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELED');
ALTER TABLE "service_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "service_orders" ALTER COLUMN "status" TYPE "ServiceOrderStatus_new" USING ("status"::text::"ServiceOrderStatus_new");
ALTER TABLE "service_order_status_history" ALTER COLUMN "fromStatus" TYPE "ServiceOrderStatus_new" USING ("fromStatus"::text::"ServiceOrderStatus_new");
ALTER TABLE "service_order_status_history" ALTER COLUMN "toStatus" TYPE "ServiceOrderStatus_new" USING ("toStatus"::text::"ServiceOrderStatus_new");
ALTER TYPE "ServiceOrderStatus" RENAME TO "ServiceOrderStatus_old";
ALTER TYPE "ServiceOrderStatus_new" RENAME TO "ServiceOrderStatus";
DROP TYPE "ServiceOrderStatus_old";
ALTER TABLE "service_orders" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "service_order_labor" DROP CONSTRAINT "service_order_labor_serviceOrderId_fkey";

-- DropForeignKey
ALTER TABLE "service_order_time_logs" DROP CONSTRAINT "service_order_time_logs_serviceOrderId_fkey";

-- DropForeignKey
ALTER TABLE "service_order_time_logs" DROP CONSTRAINT "service_order_time_logs_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "service_orders" DROP CONSTRAINT "service_orders_invoiceId_fkey";

-- AlterTable
ALTER TABLE "service_order_parts" DROP COLUMN "isWarranty",
DROP COLUMN "totalPrice",
DROP COLUMN "unitPrice";

-- AlterTable
ALTER TABLE "service_orders" DROP COLUMN "approvalChannel",
DROP COLUMN "approvedAt",
DROP COLUMN "discountAmount",
DROP COLUMN "estimatedCost",
DROP COLUMN "invoiceId",
DROP COLUMN "isApprovedByCustomer",
DROP COLUMN "laborTotal",
DROP COLUMN "partsTotal",
DROP COLUMN "slaNotifiedAt",
DROP COLUMN "totalAmount",
DROP COLUMN "type";

-- DropTable
DROP TABLE "service_order_labor";

-- DropTable
DROP TABLE "service_order_time_logs";

-- DropEnum
DROP TYPE "ServiceOrderType";

