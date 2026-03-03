-- AlterEnum: Add new GoodsReceiptStatus values
-- These must be committed before they can be used in UPDATE statements
ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'EXPECTED';
ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'DELIVERED_PAID';
ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'DELIVERED_UNPAID';
