-- Adds a tasks + notes timeline to contact submissions (parity with demo requests).
-- Existing single-field `notes` content is migrated into the new notes table, then the column is dropped.

-- CreateTable
CREATE TABLE "contact_submission_tasks" (
    "id" TEXT NOT NULL,
    "contactSubmissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submission_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submission_notes" (
    "id" TEXT NOT NULL,
    "contactSubmissionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submission_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_submission_tasks_contactSubmissionId_idx" ON "contact_submission_tasks"("contactSubmissionId");

-- CreateIndex
CREATE INDEX "contact_submission_tasks_dueDate_idx" ON "contact_submission_tasks"("dueDate");

-- CreateIndex
CREATE INDEX "contact_submission_tasks_completed_notifiedAt_idx" ON "contact_submission_tasks"("completed", "notifiedAt");

-- CreateIndex
CREATE INDEX "contact_submission_notes_contactSubmissionId_idx" ON "contact_submission_notes"("contactSubmissionId");

-- CreateIndex
CREATE INDEX "contact_submission_notes_createdAt_idx" ON "contact_submission_notes"("createdAt");

-- AddForeignKey
ALTER TABLE "contact_submission_tasks" ADD CONSTRAINT "contact_submission_tasks_contactSubmissionId_fkey" FOREIGN KEY ("contactSubmissionId") REFERENCES "contact_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_submission_notes" ADD CONSTRAINT "contact_submission_notes_contactSubmissionId_fkey" FOREIGN KEY ("contactSubmissionId") REFERENCES "contact_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-field internal notes into the new timeline (one note per submission).
INSERT INTO "contact_submission_notes" ("id", "contactSubmissionId", "content", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "notes", "updatedAt", "updatedAt"
FROM "contact_submissions"
WHERE "notes" IS NOT NULL AND btrim("notes") <> '';

-- AlterTable: drop the now-migrated single-field notes column
ALTER TABLE "contact_submissions" DROP COLUMN "notes";
