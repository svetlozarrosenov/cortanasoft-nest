-- Метод на разпределяне на разход към доставка в себестойността
CREATE TYPE "StockCostAllocation" AS ENUM ('VALUE', 'QUANTITY');
ALTER TABLE "expenses" ADD COLUMN "stockCostAllocation" "StockCostAllocation" NOT NULL DEFAULT 'VALUE';
