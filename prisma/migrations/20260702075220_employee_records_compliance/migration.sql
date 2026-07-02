-- CreateEnum
CREATE TYPE "EmployeeConsentAction" AS ENUM ('GIVEN', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmployeeRecordAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'DOWNLOAD', 'PRINT', 'NOTIFY', 'CONFIRM_DELIVERY', 'SIGN_REQUEST', 'SIGN', 'SIGN_DECLINE', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN', 'SUBMISSION', 'COPY_REQUEST', 'COPY_FULFILLED', 'SETTINGS_UPDATE');

-- CreateEnum
CREATE TYPE "EmployeeSubmissionCategory" AS ENUM ('APPLICATION', 'REQUEST', 'DECLARATION', 'NOTICE', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeSubmissionStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'ANSWERED');

-- CreateEnum
CREATE TYPE "DossierCopyRequestKind" AS ENUM ('ELECTRONIC', 'PAPER');

-- CreateEnum
CREATE TYPE "DossierCopyRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('INTERNAL', 'EVROTRUST');

-- CreateEnum
CREATE TYPE "SignatureRequestStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "employee_document_files" ADD COLUMN     "employeeSubmissionId" TEXT;

-- AlterTable
ALTER TABLE "employee_documents" ADD COLUMN     "deliveryConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "employment_annexes" ADD COLUMN     "deliveryConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "employment_contracts" ADD COLUMN     "deliveryConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "employment_orders" ADD COLUMN     "deliveryConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "terminations" ADD COLUMN     "deliveryConfirmedById" TEXT;

-- CreateTable
CREATE TABLE "employee_consents" (
    "id" TEXT NOT NULL,
    "action" "EmployeeConsentAction" NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_records_settings" (
    "id" TEXT NOT NULL,
    "electronicCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "employeeSignatureLevel" "EmployeeSignatureType" NOT NULL DEFAULT 'SES',
    "notificationPolicy" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_records_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_record_audit_events" (
    "id" TEXT NOT NULL,
    "action" "EmployeeRecordAuditAction" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "targetUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "detail" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_record_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_submissions" (
    "id" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "category" "EmployeeSubmissionCategory" NOT NULL DEFAULT 'APPLICATION',
    "status" "EmployeeSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "userId" TEXT NOT NULL,
    "confirmationSentAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answer" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_copy_requests" (
    "id" TEXT NOT NULL,
    "kind" "DossierCopyRequestKind" NOT NULL,
    "status" "DossierCopyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "scope" TEXT,
    "userId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "responseNote" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossier_copy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_signature_requests" (
    "id" TEXT NOT NULL,
    "level" "EmployeeSignatureType" NOT NULL,
    "provider" "SignatureProvider" NOT NULL DEFAULT 'INTERNAL',
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'PENDING',
    "fileId" TEXT NOT NULL,
    "signerUserId" TEXT NOT NULL,
    "requestedById" TEXT,
    "providerRef" TEXT,
    "declineReason" TEXT,
    "signedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_consents_companyId_userId_createdAt_idx" ON "employee_consents"("companyId", "userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "employee_records_settings_companyId_key" ON "employee_records_settings"("companyId");

-- CreateIndex
CREATE INDEX "employee_record_audit_events_companyId_createdAt_idx" ON "employee_record_audit_events"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "employee_record_audit_events_companyId_targetUserId_created_idx" ON "employee_record_audit_events"("companyId", "targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "employee_submissions_companyId_userId_idx" ON "employee_submissions"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employee_submissions_companyId_status_idx" ON "employee_submissions"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_submissions_companyId_regNumber_key" ON "employee_submissions"("companyId", "regNumber");

-- CreateIndex
CREATE INDEX "dossier_copy_requests_companyId_status_dueAt_idx" ON "dossier_copy_requests"("companyId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "dossier_copy_requests_companyId_userId_idx" ON "dossier_copy_requests"("companyId", "userId");

-- CreateIndex
CREATE INDEX "employee_signature_requests_companyId_signerUserId_status_idx" ON "employee_signature_requests"("companyId", "signerUserId", "status");

-- CreateIndex
CREATE INDEX "employee_signature_requests_companyId_fileId_idx" ON "employee_signature_requests"("companyId", "fileId");

-- CreateIndex
CREATE INDEX "employee_document_files_employeeSubmissionId_idx" ON "employee_document_files"("employeeSubmissionId");

-- AddForeignKey
ALTER TABLE "employee_document_files" ADD CONSTRAINT "employee_document_files_employeeSubmissionId_fkey" FOREIGN KEY ("employeeSubmissionId") REFERENCES "employee_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_consents" ADD CONSTRAINT "employee_consents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_records_settings" ADD CONSTRAINT "employee_records_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_record_audit_events" ADD CONSTRAINT "employee_record_audit_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_submissions" ADD CONSTRAINT "employee_submissions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_copy_requests" ADD CONSTRAINT "dossier_copy_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_signature_requests" ADD CONSTRAINT "employee_signature_requests_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "employee_document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_signature_requests" ADD CONSTRAINT "employee_signature_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Прехвърляне на ролевите права към новия permission модул employeeRecords:
--   hr.employeeRecords      -> employeeRecords.dossiers
--   hr.employeePersonalData -> employeeRecords.personalData
-- Копира страниците както са (enabled + actions); роли без старите права
-- получават изключен модул (enabled=false), както normalizePermissions очаква.
UPDATE "roles"
SET "permissions" = jsonb_set(
  "permissions"::jsonb,
  '{modules,employeeRecords}',
  jsonb_build_object(
    'enabled', COALESCE(("permissions"::jsonb->'modules'->'hr'->'pages'->'employeeRecords'->>'enabled')::boolean, false),
    'pages', jsonb_build_object(
      'dossiers',     COALESCE("permissions"::jsonb->'modules'->'hr'->'pages'->'employeeRecords',      '{"enabled":false}'::jsonb),
      'personalData', COALESCE("permissions"::jsonb->'modules'->'hr'->'pages'->'employeePersonalData', '{"enabled":false}'::jsonb)
    )
  ),
  true
)
WHERE "permissions"::jsonb ? 'modules';
