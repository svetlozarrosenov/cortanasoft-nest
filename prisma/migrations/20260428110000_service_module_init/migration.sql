-- Service module — initial schema (orders, assets, contracts, parts/labor/time-logs/attachments/loaners/status-history).
-- Per-company opt-in via companies.serviceModuleEnabled flag (default false).

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('NEW', 'DIAGNOSING', 'AWAITING_QUOTE', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServiceOrderType" AS ENUM ('WARRANTY', 'PAID', 'CONTRACT', 'GOODWILL');

-- CreateEnum
CREATE TYPE "ServiceOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('IN_HOUSE', 'ON_SITE', 'PICKUP');

-- CreateEnum
CREATE TYPE "ServiceAssetStatus" AS ENUM ('ACTIVE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "ServicePartSource" AS ENUM ('STOCK', 'PURCHASE', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "LoanerStatus" AS ENUM ('LOANED', 'RETURNED');

-- CreateEnum
CREATE TYPE "ServiceContractStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "serviceModuleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceProtocolTemplateKey" TEXT;

-- CreateTable
CREATE TABLE "service_assets" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "imei" TEXT,
    "vin" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "ServiceAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "warrantyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "ServiceOrderType" NOT NULL DEFAULT 'PAID',
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'NEW',
    "priority" "ServiceOrderPriority" NOT NULL DEFAULT 'NORMAL',
    "serviceLocation" "ServiceLocation" NOT NULL DEFAULT 'IN_HOUSE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedAt" TIMESTAMP(3),
    "diagnosedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "customerComplaint" TEXT NOT NULL,
    "diagnosis" TEXT,
    "workPerformed" TEXT,
    "internalNotes" TEXT,
    "accessories" TEXT,
    "cosmeticState" TEXT,
    "declaredFault" TEXT,
    "partsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isApprovedByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "approvalChannel" TEXT,
    "publicToken" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assetId" TEXT,
    "technicianId" TEXT,
    "receivedById" TEXT,
    "contractId" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_parts" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" "ServicePartSource" NOT NULL DEFAULT 'STOCK',
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "inventoryBatchId" TEXT,
    "inventorySerialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_labor" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isWarranty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_time_logs" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "minutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_time_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_attachments" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "kind" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_status_history" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "fromStatus" "ServiceOrderStatus",
    "toStatus" "ServiceOrderStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_loaners" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "serialNumber" TEXT,
    "description" TEXT,
    "status" "LoanerStatus" NOT NULL DEFAULT 'LOANED',
    "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_loaners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_contracts" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServiceContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlyFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "includedHoursPerMonth" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "responseTimeHours" INTEGER,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_assets_companyId_customerId_idx" ON "service_assets"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "service_assets_companyId_serialNumber_idx" ON "service_assets"("companyId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_assets_companyId_assetNumber_key" ON "service_assets"("companyId", "assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_publicToken_key" ON "service_orders"("publicToken");

-- CreateIndex
CREATE INDEX "service_orders_companyId_status_idx" ON "service_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "service_orders_companyId_technicianId_idx" ON "service_orders"("companyId", "technicianId");

-- CreateIndex
CREATE INDEX "service_orders_companyId_customerId_idx" ON "service_orders"("companyId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_companyId_orderNumber_key" ON "service_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "service_order_parts_serviceOrderId_idx" ON "service_order_parts"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_labor_serviceOrderId_idx" ON "service_order_labor"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_time_logs_serviceOrderId_idx" ON "service_order_time_logs"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_time_logs_technicianId_idx" ON "service_order_time_logs"("technicianId");

-- CreateIndex
CREATE INDEX "service_order_attachments_serviceOrderId_idx" ON "service_order_attachments"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_order_status_history_serviceOrderId_idx" ON "service_order_status_history"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_loaners_serviceOrderId_idx" ON "service_loaners"("serviceOrderId");

-- CreateIndex
CREATE INDEX "service_contracts_companyId_status_idx" ON "service_contracts"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_contracts_companyId_contractNumber_key" ON "service_contracts"("companyId", "contractNumber");

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_assets" ADD CONSTRAINT "service_assets_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "issued_warranties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "service_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "service_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_inventoryBatchId_fkey" FOREIGN KEY ("inventoryBatchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_inventorySerialId_fkey" FOREIGN KEY ("inventorySerialId") REFERENCES "inventory_serials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_labor" ADD CONSTRAINT "service_order_labor_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_time_logs" ADD CONSTRAINT "service_order_time_logs_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_time_logs" ADD CONSTRAINT "service_order_time_logs_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_attachments" ADD CONSTRAINT "service_order_attachments_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_attachments" ADD CONSTRAINT "service_order_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_status_history" ADD CONSTRAINT "service_order_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_loaners" ADD CONSTRAINT "service_loaners_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_loaners" ADD CONSTRAINT "service_loaners_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contracts" ADD CONSTRAINT "service_contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

