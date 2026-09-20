-- Описание на реда в продажба — snapshot на името на продукта / текст на потребителя.
-- Старите редове се попълват с текущото име на продукта.
ALTER TABLE "order_items" ADD COLUMN "description" TEXT;
UPDATE "order_items" oi SET "description" = p."name" FROM "products" p WHERE p."id" = oi."productId";
UPDATE "order_items" SET "description" = '' WHERE "description" IS NULL;
ALTER TABLE "order_items" ALTER COLUMN "description" SET NOT NULL;
