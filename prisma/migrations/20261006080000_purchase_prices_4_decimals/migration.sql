-- Покупни цени/себестойност с 4 знака (тикет #18 Инатех): доставчиците ползват
-- цени като 48.6140 и закръглянето до стотинка дава разлики по 1–2 цента.
-- Само разширяване на типа — съществуващите стойности не се променят.
ALTER TABLE "products" ALTER COLUMN "purchasePrice" TYPE DECIMAL(12,4);
ALTER TABLE "goods_receipt_items" ALTER COLUMN "unitPrice" TYPE DECIMAL(12,4);
ALTER TABLE "order_items" ALTER COLUMN "unitCost" TYPE DECIMAL(12,4);
ALTER TABLE "inventory_batches" ALTER COLUMN "unitCost" TYPE DECIMAL(12,4);
ALTER TABLE "inventory_serials" ALTER COLUMN "unitCost" TYPE DECIMAL(12,4);
ALTER TABLE "expense_items" ALTER COLUMN "unitPrice" TYPE DECIMAL(12,4);
