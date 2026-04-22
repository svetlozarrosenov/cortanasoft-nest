-- Ticket: own hoursPerDay + workingDaysPerWeek, required planned dates.
-- Sprint: no longer stores hoursPerDay — its end date is now derived from its tickets.

-- 1. Add new ticket columns (nullable hoursPerDay allowed; falls back to 8 in code)
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "hoursPerDay" DECIMAL(4,2);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5;

-- 2. Backfill missing planned dates from createdAt before enforcing NOT NULL
UPDATE "tickets" SET "plannedStartDate" = "createdAt" WHERE "plannedStartDate" IS NULL;
UPDATE "tickets" SET "plannedEndDate" = "plannedStartDate" WHERE "plannedEndDate" IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE "tickets" ALTER COLUMN "plannedStartDate" SET NOT NULL;
ALTER TABLE "tickets" ALTER COLUMN "plannedEndDate" SET NOT NULL;

-- 4. Drop sprint hoursPerDay — moved to ticket level
ALTER TABLE "sprints" DROP COLUMN IF EXISTS "hoursPerDay";
