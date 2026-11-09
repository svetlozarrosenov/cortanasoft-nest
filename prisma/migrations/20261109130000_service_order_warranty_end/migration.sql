-- Снимка на гаранцията при приемане на сервизната заявка.
ALTER TABLE "service_orders" ADD COLUMN "warrantyEndAt" TIMESTAMP(3);

-- Съществуващите заявки: гаранцията, закачена за артикула (ако е активна).
UPDATE "service_orders" so
SET "warrantyEndAt" = w."endDate"
FROM "service_assets" sa
JOIN "issued_warranties" w ON w."id" = sa."warrantyId"
WHERE sa."id" = so."assetId"
  AND so."warrantyEndAt" IS NULL
  AND w."status" = 'ACTIVE';
