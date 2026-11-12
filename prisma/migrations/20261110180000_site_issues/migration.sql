-- CreateEnum
CREATE TYPE "SiteIssueStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "SerialStatus" ADD VALUE IF NOT EXISTS 'ON_SITE';

-- CreateTable
CREATE TABLE "site_issues" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SiteIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdById" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_issue_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "returnedQty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "siteIssueId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,
    "inventorySerialId" TEXT,

    CONSTRAINT "site_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_issue_allocations" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "returnedQty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "batchNumber" TEXT NOT NULL,
    "siteIssueItemId" TEXT NOT NULL,
    "inventoryBatchId" TEXT,

    CONSTRAINT "site_issue_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_issues_companyId_siteId_idx" ON "site_issues"("companyId", "siteId");

-- CreateIndex
CREATE INDEX "site_issues_companyId_status_idx" ON "site_issues"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "site_issues_companyId_issueNumber_key" ON "site_issues"("companyId", "issueNumber");

-- CreateIndex
CREATE INDEX "site_issue_items_siteIssueId_idx" ON "site_issue_items"("siteIssueId");

-- CreateIndex
CREATE INDEX "site_issue_items_productId_idx" ON "site_issue_items"("productId");

-- CreateIndex
CREATE INDEX "site_issue_items_inventorySerialId_idx" ON "site_issue_items"("inventorySerialId");

-- CreateIndex
CREATE INDEX "site_issue_allocations_siteIssueItemId_idx" ON "site_issue_allocations"("siteIssueItemId");

-- CreateIndex
CREATE INDEX "site_issue_allocations_inventoryBatchId_idx" ON "site_issue_allocations"("inventoryBatchId");

-- AddForeignKey
ALTER TABLE "site_issues" ADD CONSTRAINT "site_issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issues" ADD CONSTRAINT "site_issues_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issues" ADD CONSTRAINT "site_issues_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issues" ADD CONSTRAINT "site_issues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issues" ADD CONSTRAINT "site_issues_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_items" ADD CONSTRAINT "site_issue_items_siteIssueId_fkey" FOREIGN KEY ("siteIssueId") REFERENCES "site_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_items" ADD CONSTRAINT "site_issue_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_items" ADD CONSTRAINT "site_issue_items_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_items" ADD CONSTRAINT "site_issue_items_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_allocations" ADD CONSTRAINT "site_issue_allocations_siteIssueItemId_fkey" FOREIGN KEY ("siteIssueItemId") REFERENCES "site_issue_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_issue_allocations" ADD CONSTRAINT "site_issue_allocations_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

