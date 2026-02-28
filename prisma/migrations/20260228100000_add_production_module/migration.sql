-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "outputQuantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" "Unit" NOT NULL DEFAULT 'PIECE',
    "notes" TEXT,
    "productId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "locationId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_materials" (
    "id" TEXT NOT NULL,
    "plannedQuantity" DECIMAL(10,3) NOT NULL,
    "actualQuantity" DECIMAL(10,3),
    "unit" "Unit" NOT NULL DEFAULT 'PIECE',
    "productId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,

    CONSTRAINT "production_order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_of_materials_companyId_productId_idx" ON "bill_of_materials"("companyId", "productId");
CREATE UNIQUE INDEX "bill_of_materials_companyId_name_key" ON "bill_of_materials"("companyId", "name");

-- CreateIndex
CREATE INDEX "bom_items_bomId_idx" ON "bom_items"("bomId");

-- CreateIndex
CREATE INDEX "production_orders_companyId_status_idx" ON "production_orders"("companyId", "status");
CREATE INDEX "production_orders_companyId_productId_idx" ON "production_orders"("companyId", "productId");
CREATE UNIQUE INDEX "production_orders_companyId_orderNumber_key" ON "production_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "production_order_materials_productionOrderId_idx" ON "production_order_materials"("productionOrderId");

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
