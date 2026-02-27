-- DropForeignKey
ALTER TABLE "goods_receipts" DROP CONSTRAINT IF EXISTS "goods_receipts_purchaseOrderId_fkey";
ALTER TABLE "goods_receipt_items" DROP CONSTRAINT IF EXISTS "goods_receipt_items_purchaseOrderItemId_fkey";
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_purchaseOrderId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "documents_purchaseOrderId_idx";
DROP INDEX IF EXISTS "purchase_orders_companyId_idx";
DROP INDEX IF EXISTS "purchase_orders_supplierId_idx";
DROP INDEX IF EXISTS "purchase_orders_createdById_idx";
DROP INDEX IF EXISTS "purchase_orders_status_idx";
DROP INDEX IF EXISTS "purchase_order_items_purchaseOrderId_idx";
DROP INDEX IF EXISTS "purchase_order_items_productId_idx";

-- AlterTable: Remove purchaseOrderId from goods_receipts
ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "purchaseOrderId";

-- AlterTable: Remove purchaseOrderItemId from goods_receipt_items
ALTER TABLE "goods_receipt_items" DROP COLUMN IF EXISTS "purchaseOrderItemId";

-- AlterTable: Remove purchaseOrderId from documents
ALTER TABLE "documents" DROP COLUMN IF EXISTS "purchaseOrderId";

-- DropTable
DROP TABLE IF EXISTS "purchase_order_items";
DROP TABLE IF EXISTS "purchase_orders";

-- DropEnum (only if not used elsewhere)
DROP TYPE IF EXISTS "PurchaseOrderStatus";
