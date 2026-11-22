-- AlterTable
ALTER TABLE "fiscal_jobs" ADD COLUMN "deviceSaleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_jobs_deviceId_deviceSaleId_key" ON "fiscal_jobs"("deviceId", "deviceSaleId");
