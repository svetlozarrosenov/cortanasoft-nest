-- ===== ProductionOrder: make bomId nullable, add title + customerId =====

ALTER TABLE "production_orders" ALTER COLUMN "bomId" DROP NOT NULL;
ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "production_orders" ADD COLUMN IF NOT EXISTS "customerId" TEXT;

CREATE INDEX IF NOT EXISTS "production_orders_companyId_customerId_idx"
    ON "production_orders"("companyId", "customerId");

ALTER TABLE "production_orders"
    ADD CONSTRAINT "production_orders_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== New table: ProductionMaterialIssuance =====

CREATE TABLE IF NOT EXISTS "production_material_issuances" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_material_issuances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "production_material_issuances_productionOrderId_idx"
    ON "production_material_issuances"("productionOrderId");
CREATE INDEX IF NOT EXISTS "production_material_issuances_companyId_productId_idx"
    ON "production_material_issuances"("companyId", "productId");
CREATE INDEX IF NOT EXISTS "production_material_issuances_companyId_issuedAt_idx"
    ON "production_material_issuances"("companyId", "issuedAt");

ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_productionOrderId_fkey"
    FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "production_material_issuances" ADD CONSTRAINT "production_material_issuances_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Migrate existing POM rows into issuances =====
-- For each POM row, create an Issuance with the actualQuantity (or plannedQuantity fallback).
-- unitCost snapshotted from the product's purchasePrice (approximation — exact historic cost is unknown).
-- Location = the production order's location.

INSERT INTO "production_material_issuances"
    ("id", "quantity", "unitCost", "issuedAt", "notes", "productId", "productionOrderId", "locationId", "createdById", "companyId", "createdAt", "updatedAt")
SELECT
    'mig_' || pom."id",
    COALESCE(pom."actualQuantity", pom."plannedQuantity"),
    COALESCE(p."purchasePrice", 0),
    COALESCE(po."actualStartDate", po."createdAt"),
    'Миграция от стар модел (ProductionOrderMaterial)',
    pom."productId",
    pom."productionOrderId",
    po."locationId",
    po."createdById",
    po."companyId",
    NOW(),
    NOW()
FROM "production_order_materials" pom
JOIN "production_orders" po ON po."id" = pom."productionOrderId"
JOIN "products" p ON p."id" = pom."productId"
WHERE po."status" NOT IN ('CANCELLED');

-- ===== Drop old POM table =====
DROP TABLE IF EXISTS "production_order_materials";
