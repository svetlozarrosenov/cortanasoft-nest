-- Remove the unused `tags` free-text column from tickets.
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "tags";
