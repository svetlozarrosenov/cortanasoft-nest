-- Разход към доставка може да влиза в себестойността на стоката (landed cost)
ALTER TABLE "expenses" ADD COLUMN "includeInStockCost" BOOLEAN NOT NULL DEFAULT false;
