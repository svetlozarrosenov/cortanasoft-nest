/*
  Warnings:

  - You are about to drop the column `deliveryConfirmedAt` on the `job_descriptions` table. All the data in the column will be lost.
  - You are about to drop the column `notifiedEmployeeAt` on the `job_descriptions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `job_descriptions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "job_descriptions_companyId_userId_idx";

-- AlterTable
ALTER TABLE "employment_contracts" ADD COLUMN     "content" TEXT;

-- AlterTable
ALTER TABLE "job_descriptions" DROP COLUMN "deliveryConfirmedAt",
DROP COLUMN "notifiedEmployeeAt",
DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "job_descriptions_companyId_position_idx" ON "job_descriptions"("companyId", "position");
