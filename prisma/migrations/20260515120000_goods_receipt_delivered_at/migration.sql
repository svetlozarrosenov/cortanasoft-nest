-- Add a separate `deliveredAt` column to goods_receipts.
-- receiptDate now represents the order date (when the user placed the order),
-- and deliveredAt is captured at the EXPECTED → DELIVERED_* transition.
-- For existing DELIVERED_* receipts, backfill deliveredAt from receiptDate
-- since the old "Дата на доставка" label meant delivery date.

ALTER TABLE "goods_receipts" ADD COLUMN "deliveredAt" TIMESTAMP(3);

UPDATE "goods_receipts"
SET "deliveredAt" = "receiptDate"
WHERE status IN ('DELIVERED_PAID', 'DELIVERED_UNPAID');
