-- Remove LEAD and PROSPECT from CustomerStage enum
ALTER TYPE "CustomerStage" RENAME TO "CustomerStage_old";
CREATE TYPE "CustomerStage" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "customers" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "customers" ALTER COLUMN "stage" TYPE "CustomerStage" USING "stage"::text::"CustomerStage";
ALTER TABLE "customers" ALTER COLUMN "stage" SET DEFAULT 'ACTIVE';
DROP TYPE "CustomerStage_old";
