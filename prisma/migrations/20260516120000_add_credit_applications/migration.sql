-- CreateEnum
CREATE TYPE "CreditApplicationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'SIGNED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CreditBank" AS ENUM ('UNICREDIT', 'POSTBANK', 'UBB', 'DSK', 'TBI', 'BNP_PARIBAS', 'PROFI_CREDIT', 'FIBANK', 'RAIFFEISEN', 'CCB', 'ALLIANZ', 'BACB', 'OTHER');

-- CreateTable
CREATE TABLE "credit_applications" (
    "id" TEXT NOT NULL,
    "status" "CreditApplicationStatus" NOT NULL DEFAULT 'REQUESTED',
    "bank" "CreditBank" NOT NULL,
    "bankRef" TEXT,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "termMonths" INTEGER,
    "monthlyPayment" DECIMAL(10,2),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decisionAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_applications_orderId_key" ON "credit_applications"("orderId");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_status_idx" ON "credit_applications"("companyId", "status");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_bank_idx" ON "credit_applications"("companyId", "bank");

-- CreateIndex
CREATE INDEX "credit_applications_companyId_appliedAt_idx" ON "credit_applications"("companyId", "appliedAt");

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_applications" ADD CONSTRAINT "credit_applications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
