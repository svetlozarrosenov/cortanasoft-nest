-- CreateTable
CREATE TABLE "integration_webhooks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_webhooks_companyId_idx" ON "integration_webhooks"("companyId");

-- CreateIndex
CREATE INDEX "integration_webhooks_companyId_isActive_idx" ON "integration_webhooks"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "integration_webhook_deliveries_webhookId_createdAt_idx" ON "integration_webhook_deliveries"("webhookId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "integration_webhook_deliveries_companyId_createdAt_idx" ON "integration_webhook_deliveries"("companyId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "integration_webhooks" ADD CONSTRAINT "integration_webhooks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "integration_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

