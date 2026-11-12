-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "siteIssueItemId" TEXT;

-- CreateIndex
CREATE INDEX "order_items_siteIssueItemId_idx" ON "order_items"("siteIssueItemId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_siteIssueItemId_fkey" FOREIGN KEY ("siteIssueItemId") REFERENCES "site_issue_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

