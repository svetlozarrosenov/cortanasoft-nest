-- Ticket: planned start/end dates for Gantt/timeline view
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "plannedStartDate" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "plannedEndDate" TIMESTAMP(3);
