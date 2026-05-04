-- Add Acceptance Protocol (Приемно-предавателен) and Ascertainment Protocol
-- (Констативен протокол) schema. These models exist in schema.prisma but their
-- backing tables / enums / Document FKs were never migrated.

CREATE TYPE "AcceptanceProtocolStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
CREATE TYPE "AscertainmentProtocolStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- ---------- acceptance_protocols ----------
CREATE TABLE "acceptance_protocols" (
  "id"                     TEXT PRIMARY KEY,
  "documentNumber"         TEXT NOT NULL,
  "documentDate"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"                 "AcceptanceProtocolStatus" NOT NULL DEFAULT 'ISSUED',
  "customerId"             TEXT,
  "recipientName"          TEXT NOT NULL,
  "recipientEik"           TEXT,
  "recipientAddress"       TEXT,
  "recipientCity"          TEXT,
  "senderRepresentative"   TEXT,
  "receiverRepresentative" TEXT,
  "subtotal"               DECIMAL(12, 2),
  "vatAmount"              DECIMAL(12, 2),
  "total"                  DECIMAL(12, 2),
  "orderId"                TEXT,
  "invoiceId"              TEXT,
  "serviceOrderId"         TEXT,
  "notes"                  TEXT,
  "companyId"              TEXT NOT NULL,
  "createdById"            TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "acceptance_protocols_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocols_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocols_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocols_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocols_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocols_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "acceptance_protocols_companyId_documentNumber_key"
  ON "acceptance_protocols"("companyId", "documentNumber");
CREATE INDEX "acceptance_protocols_companyId_status_idx"
  ON "acceptance_protocols"("companyId", "status");
CREATE INDEX "acceptance_protocols_companyId_documentDate_idx"
  ON "acceptance_protocols"("companyId", "documentDate");
CREATE INDEX "acceptance_protocols_orderId_idx"
  ON "acceptance_protocols"("orderId");

-- ---------- acceptance_protocol_items ----------
CREATE TABLE "acceptance_protocol_items" (
  "id"                   TEXT PRIMARY KEY,
  "acceptanceProtocolId" TEXT NOT NULL,
  "productId"            TEXT,
  "description"          TEXT NOT NULL,
  "quantity"             DECIMAL(12, 3) NOT NULL,
  "unitPrice"            DECIMAL(12, 2) NOT NULL,
  "vatRate"              DECIMAL(5, 2)  NOT NULL,
  "total"                DECIMAL(12, 2) NOT NULL,

  CONSTRAINT "acceptance_protocol_items_acceptanceProtocolId_fkey"
    FOREIGN KEY ("acceptanceProtocolId") REFERENCES "acceptance_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "acceptance_protocol_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "acceptance_protocol_items_acceptanceProtocolId_idx"
  ON "acceptance_protocol_items"("acceptanceProtocolId");

-- ---------- ascertainment_protocols ----------
CREATE TABLE "ascertainment_protocols" (
  "id"                     TEXT PRIMARY KEY,
  "documentNumber"         TEXT NOT NULL,
  "documentDate"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"                 "AscertainmentProtocolStatus" NOT NULL DEFAULT 'ISSUED',
  "customerId"             TEXT,
  "recipientName"          TEXT NOT NULL,
  "recipientEik"           TEXT,
  "recipientAddress"       TEXT,
  "recipientCity"          TEXT,
  "senderRepresentative"   TEXT,
  "receiverRepresentative" TEXT,
  "subject"                TEXT,
  "findings"               TEXT,
  "conclusion"             TEXT,
  "commissionMembers"      TEXT[] NOT NULL DEFAULT '{}',
  "serviceOrderId"         TEXT,
  "notes"                  TEXT,
  "companyId"              TEXT NOT NULL,
  "createdById"            TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ascertainment_protocols_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ascertainment_protocols_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ascertainment_protocols_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ascertainment_protocols_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ascertainment_protocols_companyId_documentNumber_key"
  ON "ascertainment_protocols"("companyId", "documentNumber");
CREATE INDEX "ascertainment_protocols_companyId_status_idx"
  ON "ascertainment_protocols"("companyId", "status");
CREATE INDEX "ascertainment_protocols_companyId_documentDate_idx"
  ON "ascertainment_protocols"("companyId", "documentDate");

-- ---------- documents: polymorphic FKs ----------
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "acceptanceProtocolId"    TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "ascertainmentProtocolId" TEXT;

ALTER TABLE "documents" ADD CONSTRAINT "documents_acceptanceProtocolId_fkey"
  FOREIGN KEY ("acceptanceProtocolId") REFERENCES "acceptance_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_ascertainmentProtocolId_fkey"
  FOREIGN KEY ("ascertainmentProtocolId") REFERENCES "ascertainment_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "documents_acceptanceProtocolId_idx"    ON "documents"("acceptanceProtocolId");
CREATE INDEX IF NOT EXISTS "documents_ascertainmentProtocolId_idx" ON "documents"("ascertainmentProtocolId");
