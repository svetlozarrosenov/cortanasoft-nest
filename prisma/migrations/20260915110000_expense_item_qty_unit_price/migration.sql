-- Ред на разход като ред на фактура: количество × единична цена
ALTER TABLE "expense_items" ADD COLUMN "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1;
ALTER TABLE "expense_items" ADD COLUMN "unitPrice" DECIMAL(12,2);
UPDATE "expense_items" SET "unitPrice" = "amount";
