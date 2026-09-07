-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'OPEN', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CaseChannel" AS ENUM ('EMAIL', 'PHONE', 'PORTAL', 'IN_PERSON', 'OTHER');

-- CreateTable
CREATE TABLE "customer_cases" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'NEW',
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "channel" "CaseChannel" NOT NULL DEFAULT 'EMAIL',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_messages" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFromCustomer" BOOLEAN NOT NULL DEFAULT false,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_cases_publicToken_key" ON "customer_cases"("publicToken");

-- CreateIndex
CREATE INDEX "customer_cases_companyId_status_idx" ON "customer_cases"("companyId", "status");

-- CreateIndex
CREATE INDEX "customer_cases_companyId_assignedToId_idx" ON "customer_cases"("companyId", "assignedToId");

-- CreateIndex
CREATE INDEX "customer_cases_companyId_customerId_idx" ON "customer_cases"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "customer_cases_companyId_createdAt_idx" ON "customer_cases"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_cases_companyId_caseNumber_key" ON "customer_cases"("companyId", "caseNumber");

-- CreateIndex
CREATE INDEX "case_messages_caseId_createdAt_idx" ON "case_messages"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "case_attachments_caseId_idx" ON "case_attachments"("caseId");

-- CreateIndex
CREATE INDEX "case_attachments_messageId_idx" ON "case_attachments"("messageId");

-- AddForeignKey
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_cases" ADD CONSTRAINT "customer_cases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "customer_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_messages" ADD CONSTRAINT "case_messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "customer_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "case_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

