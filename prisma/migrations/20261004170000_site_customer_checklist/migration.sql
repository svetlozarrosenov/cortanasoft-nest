-- Обект на клиент (незадължително) + чеклист за посещение. Само добавки — съществуващите обекти остават без клиент.
ALTER TABLE "sites" ADD COLUMN "customerId" TEXT;
ALTER TABLE "sites" ADD COLUMN "checklist" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "sites_companyId_customerId_idx" ON "sites"("companyId", "customerId");
ALTER TABLE "sites" ADD CONSTRAINT "sites_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
