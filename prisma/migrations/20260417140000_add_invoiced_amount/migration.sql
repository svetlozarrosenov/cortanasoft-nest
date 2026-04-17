-- Add invoicedAmount cache column to orders (SUM of non-CANCELLED invoice totals for this order)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoicedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Seed: populate invoicedAmount from existing invoices
UPDATE "orders" o
SET "invoicedAmount" = COALESCE(
    (SELECT SUM(i."total")::DECIMAL(12,2)
     FROM "invoices" i
     WHERE i."orderId" = o.id AND i."status" != 'CANCELLED'),
    0
);
