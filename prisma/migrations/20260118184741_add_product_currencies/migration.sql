-- Step 1: Add new columns for purchase and sale currencies
ALTER TABLE "products" ADD COLUMN "purchaseCurrencyId" TEXT;
ALTER TABLE "products" ADD COLUMN "purchaseExchangeRate" DECIMAL(12,6);
ALTER TABLE "products" ADD COLUMN "saleCurrencyId" TEXT;
ALTER TABLE "products" ADD COLUMN "saleExchangeRate" DECIMAL(12,6);

-- Step 2: Copy existing currency data to both purchase and sale currencies
UPDATE "products"
SET "purchaseCurrencyId" = "currencyId",
    "purchaseExchangeRate" = "exchangeRate",
    "saleCurrencyId" = "currencyId",
    "saleExchangeRate" = "exchangeRate"
WHERE "currencyId" IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE "products" DROP COLUMN "currencyId";
ALTER TABLE "products" DROP COLUMN "exchangeRate";

-- Step 4: Add foreign key constraints
ALTER TABLE "products" ADD CONSTRAINT "products_purchaseCurrencyId_fkey" FOREIGN KEY ("purchaseCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_saleCurrencyId_fkey" FOREIGN KEY ("saleCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
