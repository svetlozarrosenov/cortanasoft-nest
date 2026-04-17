-- Add paidAmount cache column to orders (derived from SUM of payments)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Create payments table (history of real payments for an order)
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "payments_companyId_orderId_idx" ON "payments"("companyId", "orderId");
CREATE INDEX IF NOT EXISTS "payments_companyId_paidAt_idx" ON "payments"("companyId", "paidAt");

-- Foreign keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_currencyId_fkey"
    FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Data migration: seed existing orders as 100% paid
-- (system has no real users yet, so all existing orders get a synthetic payment for their full total)
INSERT INTO "payments" ("id", "amount", "paidAt", "method", "notes", "orderId", "companyId", "createdById", "createdAt", "updatedAt")
SELECT
    'mig_' || "id" AS "id",
    "total" AS "amount",
    COALESCE("updatedAt", "createdAt") AS "paidAt",
    "paymentMethod" AS "method",
    'Автоматична миграция: 100% платено' AS "notes",
    "id" AS "orderId",
    "companyId",
    "createdById",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
FROM "orders"
WHERE "status" NOT IN ('DRAFT', 'CANCELLED');

-- Update cached paidAmount + paymentStatus to match
UPDATE "orders"
SET "paidAmount" = "total", "paymentStatus" = 'PAID'
WHERE "status" NOT IN ('DRAFT', 'CANCELLED');
