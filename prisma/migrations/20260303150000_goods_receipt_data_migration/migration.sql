-- Migrate existing data to new enum values
UPDATE "goods_receipts" SET "status" = 'EXPECTED' WHERE "status" = 'DRAFT';
UPDATE "goods_receipts" SET "status" = 'DELIVERED_PAID' WHERE "status" = 'COMPLETED';

-- Migrate SALARY expenses to OTHER
UPDATE "expenses" SET "category" = 'OTHER' WHERE "category" = 'SALARY';

-- Add goodsReceiptId column to expenses
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "goodsReceiptId" TEXT;

-- Add foreign key constraint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
