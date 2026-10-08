-- Прикачени файлове към оферти
ALTER TABLE "documents" ADD COLUMN "offerId" TEXT;
CREATE INDEX "documents_offerId_idx" ON "documents"("offerId");
ALTER TABLE "documents" ADD CONSTRAINT "documents_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
