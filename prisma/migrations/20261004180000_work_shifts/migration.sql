-- График на смените: планирани смени по обект/служител/дата (нова таблица, нищо съществуващо не се пипа).
CREATE TYPE "WorkShiftStatus" AS ENUM ('PLANNED', 'DONE', 'MISSED');

CREATE TABLE "work_shifts" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "note" TEXT,
  "status" "WorkShiftStatus" NOT NULL DEFAULT 'PLANNED',
  "reportedAt" TIMESTAMP(3),
  "reportedById" TEXT,
  "attendanceId" TEXT,
  "checklist" JSONB,
  "seriesId" TEXT,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_shifts_companyId_date_idx" ON "work_shifts"("companyId", "date");
CREATE INDEX "work_shifts_companyId_siteId_date_idx" ON "work_shifts"("companyId", "siteId", "date");
CREATE INDEX "work_shifts_companyId_userId_date_idx" ON "work_shifts"("companyId", "userId", "date");
CREATE INDEX "work_shifts_companyId_seriesId_idx" ON "work_shifts"("companyId", "seriesId");

ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
