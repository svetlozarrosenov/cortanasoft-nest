-- Разходът става документ с редове; съществуващите разходи → един ред всеки
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currencyId" TEXT,
    "exchangeRate" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "includeInStockCost" BOOLEAN NOT NULL DEFAULT false,
    "stockCostAllocation" "StockCostAllocation" NOT NULL DEFAULT 'VALUE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expenseId" TEXT NOT NULL,
    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expense_items_expenseId_idx" ON "expense_items"("expenseId");
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: всеки съществуващ разход = един ред. Сумите на хедъра са във
-- фирмена валута (amount × rate), затова редът пази оригиналната сума.
INSERT INTO "expense_items" ("id", "description", "category", "amount", "vatRate", "vatAmount", "currencyId", "exchangeRate", "includeInStockCost", "stockCostAllocation", "sortOrder", "expenseId")
SELECT 'exi' || substr(md5(e."id"), 1, 22), e."description", e."category",
       CASE WHEN e."exchangeRate" > 0 THEN round(e."amount" / e."exchangeRate", 2) ELSE e."amount" END,
       CASE WHEN e."amount" > 0 THEN round(e."vatAmount" / e."amount" * 100, 2) ELSE 0 END,
       CASE WHEN e."exchangeRate" > 0 THEN round(e."vatAmount" / e."exchangeRate", 2) ELSE e."vatAmount" END,
       e."currencyId", e."exchangeRate", e."includeInStockCost", e."stockCostAllocation", 0, e."id"
FROM "expenses" e;

ALTER TABLE "expenses" DROP COLUMN "includeInStockCost";
ALTER TABLE "expenses" DROP COLUMN "stockCostAllocation";
