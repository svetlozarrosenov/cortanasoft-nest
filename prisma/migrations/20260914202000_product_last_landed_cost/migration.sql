-- Последна доставна стойност за единица в картона на продукта
ALTER TABLE "products" ADD COLUMN "lastLandedCost" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "lastLandedCostAt" TIMESTAMP(3);
