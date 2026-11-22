-- CreateEnum
CREATE TYPE "FiscalDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "fiscal_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "fiscalMemoryNumber" TEXT,
    "model" TEXT,
    "appVersion" TEXT,
    "publicKey" TEXT NOT NULL,
    "status" "FiscalDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "locationId" TEXT,
    "pairedById" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "fiscal_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_pairing_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "fiscal_pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_devices_companyId_status_idx" ON "fiscal_devices"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_pairing_codes_codeHash_key" ON "fiscal_pairing_codes"("codeHash");

-- CreateIndex
CREATE INDEX "fiscal_pairing_codes_companyId_idx" ON "fiscal_pairing_codes"("companyId");

-- AddForeignKey
ALTER TABLE "fiscal_devices" ADD CONSTRAINT "fiscal_devices_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_devices" ADD CONSTRAINT "fiscal_devices_pairedById_fkey" FOREIGN KEY ("pairedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_devices" ADD CONSTRAINT "fiscal_devices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_pairing_codes" ADD CONSTRAINT "fiscal_pairing_codes_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_pairing_codes" ADD CONSTRAINT "fiscal_pairing_codes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
