-- DemoRequest: replace single `notes` column with timeline (tasks + notes models).

-- 1. Create new tables
CREATE TABLE "demo_request_tasks" (
    "id" TEXT NOT NULL,
    "demoRequestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_request_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demo_request_tasks_demoRequestId_idx" ON "demo_request_tasks"("demoRequestId");
CREATE INDEX "demo_request_tasks_dueDate_idx" ON "demo_request_tasks"("dueDate");
CREATE INDEX "demo_request_tasks_completed_notifiedAt_idx" ON "demo_request_tasks"("completed", "notifiedAt");

ALTER TABLE "demo_request_tasks"
    ADD CONSTRAINT "demo_request_tasks_demoRequestId_fkey"
    FOREIGN KEY ("demoRequestId") REFERENCES "demo_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "demo_request_notes" (
    "id" TEXT NOT NULL,
    "demoRequestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_request_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "demo_request_notes_demoRequestId_idx" ON "demo_request_notes"("demoRequestId");
CREATE INDEX "demo_request_notes_createdAt_idx" ON "demo_request_notes"("createdAt");

ALTER TABLE "demo_request_notes"
    ADD CONSTRAINT "demo_request_notes_demoRequestId_fkey"
    FOREIGN KEY ("demoRequestId") REFERENCES "demo_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill existing `notes` into new demo_request_notes (one note per request with non-empty content)
INSERT INTO "demo_request_notes" ("id", "demoRequestId", "content", "createdAt", "updatedAt")
SELECT
    'dnm_' || substr(md5(random()::text || id), 1, 21),
    "id",
    "notes",
    COALESCE("contactedAt", "createdAt"),
    CURRENT_TIMESTAMP
FROM "demo_requests"
WHERE "notes" IS NOT NULL AND trim("notes") <> '';

-- 3. Drop the old notes column
ALTER TABLE "demo_requests" DROP COLUMN "notes";
