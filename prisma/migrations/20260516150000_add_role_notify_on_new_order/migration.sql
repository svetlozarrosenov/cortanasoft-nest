-- AlterTable: per-role push opt-in for new-order notifications
ALTER TABLE "roles" ADD COLUMN "notifyOnNewOrder" BOOLEAN NOT NULL DEFAULT false;
