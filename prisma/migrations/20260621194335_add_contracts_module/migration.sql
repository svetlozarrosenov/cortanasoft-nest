-- CreateEnum
CREATE TYPE "ContractFileKind" AS ENUM ('ORIGINAL', 'SIGNED_COPY', 'ATTACHMENT');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "contractsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "counterpartyName" TEXT NOT NULL,
    "counterpartyEik" TEXT,
    "counterpartyAddress" TEXT,
    "counterpartyContact" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "ContractFileKind" NOT NULL DEFAULT 'SIGNED_COPY',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,

    CONSTRAINT "contract_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_templates_companyId_idx" ON "contract_templates"("companyId");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "contracts_customerId_idx" ON "contracts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_companyId_number_key" ON "contracts"("companyId", "number");

-- CreateIndex
CREATE INDEX "contract_files_contractId_idx" ON "contract_files"("contractId");

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_files" ADD CONSTRAINT "contract_files_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
