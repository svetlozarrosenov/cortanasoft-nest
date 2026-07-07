-- CreateEnum
CREATE TYPE "EvrotrustIdentityStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'INVALIDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmployeeRecordAuditAction" ADD VALUE 'EVROTRUST_TERMS';
ALTER TYPE "EmployeeRecordAuditAction" ADD VALUE 'EVROTRUST_IDENTIFICATION';
ALTER TYPE "EmployeeRecordAuditAction" ADD VALUE 'EVROTRUST_OTP';

-- CreateTable
CREATE TABLE "evrotrust_identities" (
    "id" TEXT NOT NULL,
    "status" "EvrotrustIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
    "referenceId" TEXT NOT NULL,
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "documentNumber" TEXT,
    "firstNameLatin" TEXT,
    "lastNameLatin" TEXT,
    "phone" TEXT,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evrotrust_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evrotrust_identities_referenceId_key" ON "evrotrust_identities"("referenceId");

-- CreateIndex
CREATE INDEX "evrotrust_identities_companyId_status_idx" ON "evrotrust_identities"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evrotrust_identities_companyId_userId_key" ON "evrotrust_identities"("companyId", "userId");

-- AddForeignKey
ALTER TABLE "evrotrust_identities" ADD CONSTRAINT "evrotrust_identities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
