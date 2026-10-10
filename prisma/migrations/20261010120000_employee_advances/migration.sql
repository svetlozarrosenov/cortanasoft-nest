-- Служебни аванси (HR > Служебни аванси) + разход, платен от аванс
CREATE TYPE "EmployeeAdvanceType" AS ENUM ('ISSUED', 'RETURNED');

CREATE TABLE "employee_advances" (
    "id" TEXT NOT NULL,
    "type" "EmployeeAdvanceType" NOT NULL DEFAULT 'ISSUED',
    "date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_advances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_advances_companyId_userId_date_idx" ON "employee_advances"("companyId", "userId", "date");

ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_advances" ADD CONSTRAINT "employee_advances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "expenses" ADD COLUMN "advanceUserId" TEXT;
CREATE INDEX "expenses_companyId_advanceUserId_idx" ON "expenses"("companyId", "advanceUserId");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_advanceUserId_fkey" FOREIGN KEY ("advanceUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
