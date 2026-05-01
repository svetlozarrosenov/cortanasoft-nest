-- =============================================================================
-- Handover Protocols (Приемо-предавателни протоколи)
--
-- Documents physical delivery of items from sales orders. Court evidence for
-- the act of handover (invoices only prove the sale, not delivery).
--
-- Status: ISSUED (default) | CANCELLED. No DRAFT — created in one click from
-- order detail with prefilled data.
--
-- Numbering: PPP-0000000001 per company (independent series).
-- Items: one row per OrderItem; partial deliveries → multiple protocols summing
-- up to OrderItem.quantity. serialNumbers[] for SERIAL products.
-- =============================================================================

CREATE TYPE "HandoverProtocolStatus" AS ENUM ('ISSUED', 'CANCELLED');

CREATE TABLE "handover_protocols" (
  "id"                     TEXT PRIMARY KEY,
  "protocolNumber"         TEXT NOT NULL,
  "protocolDate"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"                 "HandoverProtocolStatus" NOT NULL DEFAULT 'ISSUED',
  "orderId"                TEXT NOT NULL,
  "customerId"             TEXT,
  "customerName"           TEXT NOT NULL,
  "receivedByName"         TEXT NOT NULL,
  "receivedByPosition"     TEXT,
  "receivedByIdCardNumber" TEXT,
  "handoverLocation"       TEXT,
  "notes"                  TEXT,
  "companyId"              TEXT NOT NULL,
  "createdById"            TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,

  CONSTRAINT "handover_protocols_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "handover_protocols_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "handover_protocols_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "handover_protocols_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "handover_protocols_companyId_protocolNumber_key" ON "handover_protocols"("companyId", "protocolNumber");
CREATE INDEX "handover_protocols_companyId_status_idx" ON "handover_protocols"("companyId", "status");
CREATE INDEX "handover_protocols_companyId_protocolDate_idx" ON "handover_protocols"("companyId", "protocolDate");
CREATE INDEX "handover_protocols_orderId_idx" ON "handover_protocols"("orderId");

CREATE TABLE "handover_protocol_items" (
  "id"            TEXT PRIMARY KEY,
  "protocolId"    TEXT NOT NULL,
  "orderItemId"   TEXT NOT NULL,
  "productId"     TEXT,
  "description"   TEXT NOT NULL,
  "quantity"      DECIMAL(12, 3) NOT NULL,
  "serialNumbers" TEXT[] NOT NULL DEFAULT '{}',

  CONSTRAINT "handover_protocol_items_protocolId_fkey"
    FOREIGN KEY ("protocolId") REFERENCES "handover_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "handover_protocol_items_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "handover_protocol_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "handover_protocol_items_protocolId_idx" ON "handover_protocol_items"("protocolId");
