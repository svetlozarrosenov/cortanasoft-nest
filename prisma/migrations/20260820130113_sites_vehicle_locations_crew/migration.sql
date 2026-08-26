-- AlterEnum
ALTER TYPE "LocationType" ADD VALUE 'VEHICLE';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "siteId" TEXT;

-- CreateTable
CREATE TABLE "location_members" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_members_userId_idx" ON "location_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "location_members_locationId_userId_key" ON "location_members"("locationId", "userId");

-- CreateIndex
CREATE INDEX "sites_companyId_isActive_idx" ON "sites"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "expenses_siteId_idx" ON "expenses"("siteId");

-- CreateIndex
CREATE INDEX "orders_siteId_idx" ON "orders"("siteId");

-- AddForeignKey
ALTER TABLE "location_members" ADD CONSTRAINT "location_members_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_members" ADD CONSTRAINT "location_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
