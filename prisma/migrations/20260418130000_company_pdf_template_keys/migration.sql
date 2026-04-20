-- Company: per-company PDF template keys. NULL = default template.
-- Superadmin assigns custom template keys when a client has a bespoke design.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "invoiceTemplateKey" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "offerTemplateKey" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "stockDocumentTemplateKey" TEXT;
