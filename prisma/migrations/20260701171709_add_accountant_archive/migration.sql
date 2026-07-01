-- CreateTable
CREATE TABLE "accountant_archives" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentTo" TEXT NOT NULL,
    "registerKey" TEXT NOT NULL,
    "incomeCount" INTEGER NOT NULL DEFAULT 0,
    "expenseCount" INTEGER NOT NULL DEFAULT 0,
    "statementCount" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accountant_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accountant_archives_companyId_sentAt_idx" ON "accountant_archives"("companyId", "sentAt");

-- CreateIndex
CREATE INDEX "accountant_archives_companyId_year_month_idx" ON "accountant_archives"("companyId", "year", "month");

-- AddForeignKey
ALTER TABLE "accountant_archives" ADD CONSTRAINT "accountant_archives_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
