-- Дата на плащане на платените фактури: досега се записваше само при ръчно
-- отбелязване „платена"; плащанията през модула Плащания я пропускаха.
-- Backfill: последното получено плащане по поръчката, иначе updatedAt.
UPDATE "invoices" i
SET "paymentDate" = p."lastPaidAt"
FROM (
  SELECT "orderId", max("paidAt") AS "lastPaidAt"
  FROM "payments"
  WHERE amount > 0 AND "orderId" IS NOT NULL
  GROUP BY "orderId"
) p
WHERE i."orderId" = p."orderId" AND i.status = 'PAID' AND i."paymentDate" IS NULL;

UPDATE "invoices"
SET "paymentDate" = "updatedAt"
WHERE status = 'PAID' AND "paymentDate" IS NULL;
