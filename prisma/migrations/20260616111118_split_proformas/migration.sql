-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "proformaId" TEXT;

-- CreateTable
CREATE TABLE "proformas" (
    "id" TEXT NOT NULL,
    "proformaNumber" TEXT NOT NULL,
    "proformaDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEik" TEXT,
    "customerVatNumber" TEXT,
    "customerAddress" TEXT,
    "customerCity" TEXT,
    "customerPostalCode" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proformas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proforma_items" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "proforma_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proformas_companyId_status_idx" ON "proformas"("companyId", "status");

-- CreateIndex
CREATE INDEX "proformas_companyId_proformaDate_idx" ON "proformas"("companyId", "proformaDate");

-- CreateIndex
CREATE INDEX "proformas_customerId_idx" ON "proformas"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "proformas_companyId_proformaNumber_key" ON "proformas"("companyId", "proformaNumber");

-- CreateIndex
CREATE INDEX "proforma_items_proformaId_idx" ON "proforma_items"("proformaId");

-- CreateIndex
CREATE INDEX "documents_proformaId_idx" ON "documents"("proformaId");

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proforma_items" ADD CONSTRAINT "proforma_items_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "proformas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proforma_items" ADD CONSTRAINT "proforma_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "proformas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Премахване на проформите от таблицата за фактури (данъчни документи).
-- Проформата не е данъчен документ и вече живее в собствена таблица `proformas`.
-- Старите PROFORMA-записи не се мигрират — изтриват се. Прикачените към тях
-- документи се трият каскадно по FK `documents.invoiceId` (ON DELETE CASCADE).
DELETE FROM "invoice_items" WHERE "invoiceId" IN (SELECT "id" FROM "invoices" WHERE "type" = 'PROFORMA');
DELETE FROM "invoices" WHERE "type" = 'PROFORMA';
