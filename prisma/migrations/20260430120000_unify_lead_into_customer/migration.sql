-- =============================================================================
-- Unify Lead into Customer
--
-- Background:
--   - Customer is the unified contact entity (per existing schema comment).
--   - Lead historically meant two things: (1) standalone potential customer,
--     (2) contact person at a customer. Per product decision, contact persons
--     are NOT kept; only the lifecycle stage (LEAD vs CLIENT) is preserved on
--     Customer.
--
-- Steps (single atomic migration):
--   1. Replace CustomerStage enum: ACTIVE/INACTIVE → LEAD/CLIENT.
--      All existing customers were treated as real clients — they become CLIENT.
--   2. Migrate standalone Lead rows (customerId IS NULL) into Customer with
--      stage=LEAD and type=INDIVIDUAL. ID preserved so any FK pointing at the
--      lead (Deal.leadId) keeps working.
--   3. Migrate Deal.leadId → Deal.customerId (since the lead row is now a
--      customer row with the same id).
--   4. Drop Deal.leadId column and the leads table.
-- =============================================================================

-- 1) New enum + transition values
ALTER TYPE "CustomerStage" RENAME TO "CustomerStage_old";
CREATE TYPE "CustomerStage" AS ENUM ('LEAD', 'CLIENT');

ALTER TABLE "customers"
  ALTER COLUMN "stage" DROP DEFAULT,
  ALTER COLUMN "stage" TYPE "CustomerStage"
    USING ('CLIENT'::"CustomerStage"),
  ALTER COLUMN "stage" SET DEFAULT 'LEAD';

DROP TYPE "CustomerStage_old";

-- 2) Standalone leads → customers (preserve id so existing FKs keep working)
INSERT INTO "customers" (
  "id", "type", "stage", "firstName", "lastName",
  "email", "phone", "mobile", "notes",
  "isActive", "companyId", "createdAt", "updatedAt"
)
SELECT
  "id", 'INDIVIDUAL'::"CustomerType", 'LEAD'::"CustomerStage",
  "firstName", "lastName",
  "email", "phone", "mobile", "notes",
  "isActive", "companyId", "createdAt", "updatedAt"
FROM "leads"
WHERE "customerId" IS NULL;

-- 3) Repoint deals.leadId → deals.customerId
--    For deals that had only leadId set, the lead's id now lives in customers.
--    For deals that had both, customerId is already populated; we keep that.
UPDATE "deals"
SET "customerId" = "leadId"
WHERE "customerId" IS NULL
  AND "leadId" IS NOT NULL;

-- 4) Drop Deal.leadId FK + column, then drop leads table
ALTER TABLE "deals" DROP CONSTRAINT IF EXISTS "deals_leadId_fkey";
ALTER TABLE "deals" DROP COLUMN IF EXISTS "leadId";

DROP TABLE "leads";
