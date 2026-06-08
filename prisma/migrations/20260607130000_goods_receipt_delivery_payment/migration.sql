-- Goods receipts: split delivery status from payment status + add a payment ledger
-- (mirrors orders). The old GoodsReceiptStatus conflated both
-- (DELIVERED_PAID / DELIVERED_UNPAID); we move payment into its own column and
-- bring the Payment ledger to goods receipts (Payment becomes polymorphic).

-- 1) Payment becomes polymorphic: orderId nullable + goodsReceiptId
ALTER TABLE "payments" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "payments" ADD COLUMN "goodsReceiptId" TEXT;

-- 2) GoodsReceipt: separate payment status + derived amounts
ALTER TABLE "goods_receipts" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "goods_receipts" ADD COLUMN "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "goods_receipts" ADD COLUMN "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- 3) Backfill totalAmount = items(qty*price*rate*(1+vat/100)) + expenses(totalAmount)
UPDATE "goods_receipts" gr SET "totalAmount" =
  COALESCE((
    SELECT SUM(gri."quantity" * gri."unitPrice" * gri."exchangeRate" * (1 + gri."vatRate" / 100))
    FROM "goods_receipt_items" gri WHERE gri."goodsReceiptId" = gr."id"
  ), 0)
  + COALESCE((
    SELECT SUM(e."totalAmount") FROM "expenses" e WHERE e."goodsReceiptId" = gr."id"
  ), 0);

-- 4) Derive the new payment status from the old conflated status.
--    DELIVERED_PAID  -> paid in full;  everything else stays PENDING.
UPDATE "goods_receipts"
  SET "paymentStatus" = 'PAID', "paidAmount" = "totalAmount"
  WHERE "status"::text = 'DELIVERED_PAID';

-- 5) Synthetic payment records for migrated paid receipts (keeps the ledger
--    consistent so paidAmount/paymentStatus stay correct on later recompute).
INSERT INTO "payments"
  ("id", "amount", "paidAt", "method", "notes", "exchangeRate", "goodsReceiptId", "companyId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  gr."totalAmount",
  COALESCE(gr."deliveredAt", gr."receiptDate"),
  'BANK_TRANSFER',
  'Миграция: пренесено от стария статус „Доставена и платена"',
  1,
  gr."id",
  gr."companyId",
  now(),
  now()
FROM "goods_receipts" gr
WHERE gr."status"::text = 'DELIVERED_PAID' AND gr."totalAmount" > 0;

-- 6) Recreate GoodsReceiptStatus without the payment variants, mapping data.
ALTER TYPE "GoodsReceiptStatus" RENAME TO "GoodsReceiptStatus_old";
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('EXPECTED', 'DELIVERED', 'CANCELLED');
ALTER TABLE "goods_receipts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "goods_receipts" ALTER COLUMN "status" TYPE "GoodsReceiptStatus"
  USING (
    CASE "status"::text
      WHEN 'DELIVERED_PAID' THEN 'DELIVERED'
      WHEN 'DELIVERED_UNPAID' THEN 'DELIVERED'
      ELSE "status"::text
    END
  )::"GoodsReceiptStatus";
ALTER TABLE "goods_receipts" ALTER COLUMN "status" SET DEFAULT 'EXPECTED';
DROP TYPE "GoodsReceiptStatus_old";

-- 7) FK + index for the new Payment.goodsReceiptId
ALTER TABLE "payments" ADD CONSTRAINT "payments_goodsReceiptId_fkey"
  FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "payments_companyId_goodsReceiptId_idx" ON "payments"("companyId", "goodsReceiptId");
