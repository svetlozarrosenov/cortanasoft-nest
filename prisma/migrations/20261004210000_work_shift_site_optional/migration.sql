-- Смяна без обект: siteId става незадължителен, при изтрит обект смяната остава.
ALTER TABLE "work_shifts" ALTER COLUMN "siteId" DROP NOT NULL;
ALTER TABLE "work_shifts" DROP CONSTRAINT "work_shifts_siteId_fkey";
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
