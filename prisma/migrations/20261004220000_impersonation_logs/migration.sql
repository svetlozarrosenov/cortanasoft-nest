-- Одит на „Влез като" от администрацията.
CREATE TABLE "impersonation_logs" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "ip" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "impersonation_logs_companyId_startedAt_idx" ON "impersonation_logs"("companyId", "startedAt");
CREATE INDEX "impersonation_logs_adminId_startedAt_idx" ON "impersonation_logs"("adminId", "startedAt");
