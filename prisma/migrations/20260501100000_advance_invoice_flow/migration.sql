-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'ADVANCE';
ALTER TYPE "InvoiceType" ADD VALUE 'FINAL';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "advancedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "invoice_advance_deductions" (
    "id" TEXT NOT NULL,
    "finalInvoiceId" TEXT NOT NULL,
    "advanceInvoiceId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_advance_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_advance_deductions_finalInvoiceId_advanceInvoiceId_key" ON "invoice_advance_deductions"("finalInvoiceId", "advanceInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_advance_deductions_advanceInvoiceId_idx" ON "invoice_advance_deductions"("advanceInvoiceId");

-- AddForeignKey
ALTER TABLE "invoice_advance_deductions" ADD CONSTRAINT "invoice_advance_deductions_finalInvoiceId_fkey" FOREIGN KEY ("finalInvoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_advance_deductions" ADD CONSTRAINT "invoice_advance_deductions_advanceInvoiceId_fkey" FOREIGN KEY ("advanceInvoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
