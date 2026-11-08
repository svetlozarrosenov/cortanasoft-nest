-- CreateTable
CREATE TABLE "pigeon_configs" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'sandbox',
    "pickupType" TEXT NOT NULL DEFAULT 'office',
    "pickupOfficeId" INTEGER,
    "senderAddressId" INTEGER,
    "serviceType" TEXT NOT NULL DEFAULT 'standard',
    "whoPays" TEXT NOT NULL DEFAULT 'receiver',
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "declaredValueEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsNotification" BOOLEAN NOT NULL DEFAULT false,
    "returnAtMyExpense" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "pigeon_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pigeon_configs_companyId_key" ON "pigeon_configs"("companyId");

-- AddForeignKey
ALTER TABLE "pigeon_configs" ADD CONSTRAINT "pigeon_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
