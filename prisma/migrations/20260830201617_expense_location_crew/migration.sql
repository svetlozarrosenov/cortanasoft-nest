-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "expense_crew_members" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_crew_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_crew_members_expenseId_idx" ON "expense_crew_members"("expenseId");

-- CreateIndex
CREATE INDEX "expense_crew_members_userId_idx" ON "expense_crew_members"("userId");

-- CreateIndex
CREATE INDEX "expenses_locationId_idx" ON "expenses"("locationId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_crew_members" ADD CONSTRAINT "expense_crew_members_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_crew_members" ADD CONSTRAINT "expense_crew_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
