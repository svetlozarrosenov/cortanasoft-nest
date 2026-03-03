-- Simplify Contact model: make customerId optional, change onDelete to SetNull
-- Drop foreign key, alter column to nullable, re-add with SetNull

-- Make customerId nullable
ALTER TABLE "contacts" ALTER COLUMN "customerId" DROP NOT NULL;

-- Drop existing foreign key constraint
ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "contacts_customerId_fkey";

-- Re-add foreign key with SetNull on delete
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
