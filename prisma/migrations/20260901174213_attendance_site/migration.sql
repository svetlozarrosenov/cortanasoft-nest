-- DropIndex
DROP INDEX "attendances_companyId_userId_date_key";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "siteId" TEXT;

-- CreateIndex
CREATE INDEX "attendances_companyId_userId_date_idx" ON "attendances"("companyId", "userId", "date");

-- CreateIndex
CREATE INDEX "attendances_siteId_idx" ON "attendances"("siteId");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
