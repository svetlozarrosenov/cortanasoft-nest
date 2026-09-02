-- Присъствията не са заявки за одобрение: статус/одобрител се махат.
-- Всички съществуващи записи са APPROVED, така че няма загуба на смисъл.

-- DropIndex
DROP INDEX "attendances_companyId_status_idx";

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "AttendanceStatus";
