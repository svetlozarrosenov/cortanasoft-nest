-- Align ContactSubmissionStatus with DemoRequestStatus (shared lead pipeline).
-- New values: NEW, CONTACTED, SCHEDULED, COMPLETED, CANCELLED.
-- Existing rows are remapped: READ/REPLIED -> CONTACTED, ARCHIVED -> CANCELLED, NEW -> NEW.

-- Create the new enum type.
CREATE TYPE "ContactSubmissionStatus_new" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- Drop the column default so the type swap is not blocked by it.
ALTER TABLE "contact_submissions" ALTER COLUMN "status" DROP DEFAULT;

-- Convert the column to the new enum, remapping legacy values on the way.
ALTER TABLE "contact_submissions"
  ALTER COLUMN "status" TYPE "ContactSubmissionStatus_new"
  USING (
    CASE "status"::text
      WHEN 'READ' THEN 'CONTACTED'
      WHEN 'REPLIED' THEN 'CONTACTED'
      WHEN 'ARCHIVED' THEN 'CANCELLED'
      ELSE "status"::text
    END
  )::"ContactSubmissionStatus_new";

-- Restore the default on the new type.
ALTER TABLE "contact_submissions" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- Swap the types.
DROP TYPE "ContactSubmissionStatus";
ALTER TYPE "ContactSubmissionStatus_new" RENAME TO "ContactSubmissionStatus";
