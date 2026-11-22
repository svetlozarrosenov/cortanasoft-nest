-- CreateEnum
CREATE TYPE "FiscalJobStatus" AS ENUM ('PENDING', 'SENT', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'UNCLEAR');

-- CreateTable
CREATE TABLE "fiscal_jobs" (
    "id" TEXT NOT NULL,
    "status" "FiscalJobStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "items" JSONB NOT NULL,
    "receiptLines" JSONB NOT NULL,
    "stage" TEXT,
    "receiptNumber" INTEGER,
    "receiptDateTime" TEXT,
    "fiscalMemoryNumber" TEXT,
    "card" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "orderId" TEXT,
    "orderError" TEXT,
    "deviceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,

    CONSTRAINT "fiscal_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_jobs_deviceId_status_idx" ON "fiscal_jobs"("deviceId", "status");

-- CreateIndex
CREATE INDEX "fiscal_jobs_companyId_createdAt_idx" ON "fiscal_jobs"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "fiscal_jobs" ADD CONSTRAINT "fiscal_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_jobs" ADD CONSTRAINT "fiscal_jobs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "fiscal_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_jobs" ADD CONSTRAINT "fiscal_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
