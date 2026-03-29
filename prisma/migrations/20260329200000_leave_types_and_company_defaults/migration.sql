-- Add defaultAnnualLeaveDays to companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "defaultAnnualLeaveDays" INTEGER NOT NULL DEFAULT 20;

-- Remove BEREAVEMENT and STUDY from LeaveType enum
-- First convert any existing records
UPDATE "leaves" SET "type" = 'OTHER' WHERE "type" IN ('BEREAVEMENT', 'STUDY');

-- Recreate enum without BEREAVEMENT and STUDY
ALTER TYPE "LeaveType" RENAME TO "LeaveType_old";
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER');
ALTER TABLE "leaves" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "leaves" ALTER COLUMN "type" TYPE "LeaveType" USING "type"::text::"LeaveType";
ALTER TABLE "leaves" ALTER COLUMN "type" SET DEFAULT 'ANNUAL';
DROP TYPE "LeaveType_old";
