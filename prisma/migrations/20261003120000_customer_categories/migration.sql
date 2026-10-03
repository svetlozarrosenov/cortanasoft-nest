-- Категории клиенти (по фирма, няколко на клиент) + връзки клиент ↔ категория.
CREATE TABLE "customer_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customer_categories_companyId_name_key" ON "customer_categories"("companyId", "name");
ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "customer_category_links" (
  "customerId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_category_links_pkey" PRIMARY KEY ("customerId", "categoryId")
);
CREATE INDEX "customer_category_links_companyId_categoryId_idx" ON "customer_category_links"("companyId", "categoryId");
ALTER TABLE "customer_category_links" ADD CONSTRAINT "customer_category_links_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_category_links" ADD CONSTRAINT "customer_category_links_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "customer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_category_links" ADD CONSTRAINT "customer_category_links_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
