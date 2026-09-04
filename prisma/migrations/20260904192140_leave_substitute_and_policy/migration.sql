-- AlterTable
ALTER TABLE "hr_settings" ADD COLUMN     "leaveMaxBackdateDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN     "leaveMinNoticeDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "leaves" ADD COLUMN     "substituteUserId" TEXT;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_substituteUserId_fkey" FOREIGN KEY ("substituteUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
