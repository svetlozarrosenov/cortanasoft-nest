-- Remove `dueDate` from tickets — replaced by plannedStartDate/plannedEndDate.
DROP INDEX IF EXISTS "tickets_companyId_dueDate_idx";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "dueDate";
