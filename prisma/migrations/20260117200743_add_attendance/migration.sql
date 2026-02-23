-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('REGULAR', 'REMOTE', 'HALF_DAY', 'OVERTIME', 'SICK_LEAVE', 'VACATION', 'UNPAID_LEAVE', 'BUSINESS_TRIP', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "AttendanceType" NOT NULL DEFAULT 'REGULAR',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'APPROVED',
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedMinutes" INTEGER,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_companyId_idx" ON "attendances"("companyId");

-- CreateIndex
CREATE INDEX "attendances_companyId_userId_idx" ON "attendances"("companyId", "userId");

-- CreateIndex
CREATE INDEX "attendances_companyId_date_idx" ON "attendances"("companyId", "date");

-- CreateIndex
CREATE INDEX "attendances_companyId_status_idx" ON "attendances"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_companyId_userId_date_key" ON "attendances"("companyId", "userId", "date");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
