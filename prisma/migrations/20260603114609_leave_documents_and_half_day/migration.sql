-- AlterTable
ALTER TABLE "leaves" ADD COLUMN     "attachmentKey" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "halfDay" BOOLEAN NOT NULL DEFAULT false;
