-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "CompanyPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "company_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "billingDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "invoiceNotes" TEXT,
    "status" "CompanyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoInvoice" BOOLEAN NOT NULL DEFAULT true,
    "lastInvoiceDate" TIMESTAMP(3),
    "nextInvoiceDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "total" DECIMAL(12,2) NOT NULL,
    "productId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_plan_invoices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_plan_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_plans_companyId_idx" ON "company_plans"("companyId");

-- CreateIndex
CREATE INDEX "company_plans_status_idx" ON "company_plans"("status");

-- CreateIndex
CREATE INDEX "company_plans_nextInvoiceDate_idx" ON "company_plans"("nextInvoiceDate");

-- CreateIndex
CREATE INDEX "company_plan_items_planId_idx" ON "company_plan_items"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "company_plan_invoices_invoiceId_key" ON "company_plan_invoices"("invoiceId");

-- CreateIndex
CREATE INDEX "company_plan_invoices_planId_idx" ON "company_plan_invoices"("planId");

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plans" ADD CONSTRAINT "company_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_items" ADD CONSTRAINT "company_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "company_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_items" ADD CONSTRAINT "company_plan_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_invoices" ADD CONSTRAINT "company_plan_invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "company_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_plan_invoices" ADD CONSTRAINT "company_plan_invoices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
