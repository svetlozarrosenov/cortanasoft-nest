-- Link stock documents (protocols) to service orders so the same protocol module
-- can issue приемен/предавателен/констативен protocols for service workflow.

-- AlterTable
ALTER TABLE "stock_documents" ADD COLUMN     "serviceOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
