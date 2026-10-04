-- Лица за контакт на клиента (няколко на клиент, по фирма).
CREATE TABLE "customer_contacts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "note" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "customerId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_contacts_companyId_customerId_idx" ON "customer_contacts"("companyId", "customerId");
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
