-- Номер на първата проформа на компанията (Администрация > Компании), както при фактурите
ALTER TABLE "companies" ADD COLUMN "proformaDefaultStartNumber" INTEGER NOT NULL DEFAULT 1;
