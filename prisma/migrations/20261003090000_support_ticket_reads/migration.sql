-- Поддръжка: кога потребителят за последно е отворил тикета (непрочетени съобщения
-- на ниво потребител).
CREATE TABLE "support_ticket_reads" (
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_ticket_reads_pkey" PRIMARY KEY ("ticketId", "userId")
);
CREATE INDEX "support_ticket_reads_userId_idx" ON "support_ticket_reads"("userId");
ALTER TABLE "support_ticket_reads" ADD CONSTRAINT "support_ticket_reads_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_reads" ADD CONSTRAINT "support_ticket_reads_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Заварените решени/затворени тикети се водят прочетени за всички, за да не
-- светне цялата история като „нова" при първия вход. Отворените остават
-- непрочетени — по тях наистина може да има неотговорено.
INSERT INTO "support_ticket_reads" ("ticketId", "userId", "lastReadAt")
SELECT DISTINCT t."id", uc."userId", CURRENT_TIMESTAMP
FROM "support_tickets" t
JOIN "user_companies" uc
  ON uc."companyId" = t."companyId"
  OR uc."companyId" IN (SELECT "id" FROM "companies" WHERE "role" = 'OWNER')
WHERE t."status" IN ('RESOLVED', 'CLOSED')
ON CONFLICT DO NOTHING;
