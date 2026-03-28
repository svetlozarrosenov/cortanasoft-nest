-- Rename table contacts -> leads
ALTER TABLE "contacts" RENAME TO "leads";

-- Rename column contactId -> leadId in deals table
ALTER TABLE "deals" RENAME COLUMN "contactId" TO "leadId";

-- Rename indexes
ALTER INDEX IF EXISTS "contacts_companyId_idx" RENAME TO "leads_companyId_idx";
ALTER INDEX IF EXISTS "contacts_customerId_idx" RENAME TO "leads_customerId_idx";
ALTER INDEX IF EXISTS "contacts_companyId_lastName_idx" RENAME TO "leads_companyId_lastName_idx";
ALTER INDEX IF EXISTS "contacts_companyId_email_idx" RENAME TO "leads_companyId_email_idx";
