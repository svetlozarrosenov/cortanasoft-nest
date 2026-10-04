-- AI задачи в базата вместо в паметта: оцеляват рестарт + справка за употреба по фирма.
CREATE TYPE "AiJobKind" AS ENUM ('DELIVERY_SCAN', 'BANK_RECONCILE', 'EXPENSE_SCAN');
CREATE TYPE "AiJobStatus" AS ENUM ('RUNNING', 'DONE', 'ERROR');

CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "AiJobKind" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'RUNNING',
    "result" JSONB,
    "message" TEXT,
    "model" TEXT,
    "turns" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_jobs_companyId_createdAt_idx" ON "ai_jobs"("companyId", "createdAt");
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs"("status");

ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
