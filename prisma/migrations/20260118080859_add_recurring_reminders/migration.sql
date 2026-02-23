-- CreateEnum
CREATE TYPE "ReminderRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- AlterTable
ALTER TABLE "ticket_reminders" ADD COLUMN     "intervalDays" INTEGER,
ADD COLUMN     "recurrence" "ReminderRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "recurrenceCount" INTEGER,
ADD COLUMN     "recurrenceEnd" TIMESTAMP(3),
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
