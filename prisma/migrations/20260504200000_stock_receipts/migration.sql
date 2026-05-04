-- Add Stock Receipt (Стокова разписка) tables and enum.
-- Models exist in schema.prisma but have never been migrated.
-- NOTE: must run BEFORE 20260504190000_acceptance_ascertainment_protocols if
-- migrate has not yet been deployed; Prisma replays migrations chronologically
-- so this filename ordering is fine if both are applied together.
-- The companies.stockReceiptTemplateKey FK target column is not strict (no FK),
-- but Document.stockReceiptId FK requires this table.

CREATE TYPE "StockReceiptStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

CREATE TABLE "stock_receipts" (
  "id"                     TEXT PRIMARY KEY,
  "documentNumber"         TEXT NOT NULL,
  "documentDate"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"                 "StockReceiptStatus" NOT NULL DEFAULT 'ISSUED',
  "customerId"             TEXT,
  "recipientName"          TEXT NOT NULL,
  "recipientEik"           TEXT,
  "recipientAddress"       TEXT,
  "recipientCity"          TEXT,
  "senderRepresentative"   TEXT,
  "receiverRepresentative" TEXT,
  "subtotal"               DECIMAL(12, 2),
  "vatAmount"              DECIMAL(12, 2),
  "total"                  DECIMAL(12, 2),
  "invoiceId"              TEXT,
  "serviceOrderId"         TEXT,
  "notes"                  TEXT,
  "companyId"              TEXT NOT NULL,
  "createdById"            TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "stock_receipts_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_receipts_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_receipts_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "stock_receipts_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_receipts_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "stock_receipts_companyId_documentNumber_key"
  ON "stock_receipts"("companyId", "documentNumber");
CREATE INDEX "stock_receipts_companyId_status_idx"
  ON "stock_receipts"("companyId", "status");
CREATE INDEX "stock_receipts_companyId_documentDate_idx"
  ON "stock_receipts"("companyId", "documentDate");

CREATE TABLE "stock_receipt_items" (
  "id"             TEXT PRIMARY KEY,
  "stockReceiptId" TEXT NOT NULL,
  "productId"      TEXT,
  "description"    TEXT NOT NULL,
  "quantity"       DECIMAL(12, 3) NOT NULL,
  "unitPrice"      DECIMAL(12, 2) NOT NULL,
  "vatRate"        DECIMAL(5, 2)  NOT NULL,
  "total"          DECIMAL(12, 2) NOT NULL,

  CONSTRAINT "stock_receipt_items_stockReceiptId_fkey"
    FOREIGN KEY ("stockReceiptId") REFERENCES "stock_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_receipt_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "stock_receipt_items_stockReceiptId_idx"
  ON "stock_receipt_items"("stockReceiptId");

-- documents.stockReceiptId FK (column may already exist from earlier work)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "stockReceiptId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_stockReceiptId_fkey'
  ) THEN
    ALTER TABLE "documents" ADD CONSTRAINT "documents_stockReceiptId_fkey"
      FOREIGN KEY ("stockReceiptId") REFERENCES "stock_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_stockReceiptId_idx" ON "documents"("stockReceiptId");
