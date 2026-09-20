-- Номер на първата фактура per company; 1 = досегашното поведение
ALTER TABLE "companies" ADD COLUMN "invoiceDefaultStartNumber" INTEGER NOT NULL DEFAULT 1;
