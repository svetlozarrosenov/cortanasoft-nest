-- Часовата ставка се пази с 4 знака, за да се връща точно дневният надник
-- (напр. 89.50 / 8 = 11.1875). Само разширяване на скалата, данните не се променят.
ALTER TABLE "user_companies" ALTER COLUMN "hourlyRate" TYPE DECIMAL(10,4);
ALTER TABLE "positions" ALTER COLUMN "hourlyRate" TYPE DECIMAL(10,4);
