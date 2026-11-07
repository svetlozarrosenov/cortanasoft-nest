-- CreateTable
CREATE TABLE "shipping_automations" (
    "id" TEXT NOT NULL,
    "syncStatuses" BOOLEAN NOT NULL DEFAULT false,
    "markOrdersDelivered" BOOLEAN NOT NULL DEFAULT false,
    "recordCodPayments" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "shipping_automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_automations_companyId_key" ON "shipping_automations"("companyId");

-- AddForeignKey
ALTER TABLE "shipping_automations" ADD CONSTRAINT "shipping_automations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
