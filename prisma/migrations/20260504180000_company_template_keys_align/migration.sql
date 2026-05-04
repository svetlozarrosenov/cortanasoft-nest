-- Align companies template-key columns with current Prisma schema.
-- 1) Rename legacy stockDocumentTemplateKey → stockReceiptTemplateKey (if old name still present).
-- 2) Add missing protocol template key columns.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'stockDocumentTemplateKey'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'stockReceiptTemplateKey'
  ) THEN
    ALTER TABLE "companies" RENAME COLUMN "stockDocumentTemplateKey" TO "stockReceiptTemplateKey";
  END IF;
END $$;

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stockReceiptTemplateKey" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "acceptanceProtocolTemplateKey" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "ascertainmentProtocolTemplateKey" TEXT;
