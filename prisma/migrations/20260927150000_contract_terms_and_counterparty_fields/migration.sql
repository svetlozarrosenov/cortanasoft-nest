-- Договори: ДДС номер, МОЛ и имейл на контрагента + търговски условия
-- (месечна/годишна такса, брой потребители) за полетата за сливане в шаблоните
ALTER TABLE "contracts" ADD COLUMN "counterpartyVatNumber" TEXT;
ALTER TABLE "contracts" ADD COLUMN "counterpartyRepresentative" TEXT;
ALTER TABLE "contracts" ADD COLUMN "counterpartyEmail" TEXT;
ALTER TABLE "contracts" ADD COLUMN "monthlyFee" DECIMAL(12,2);
ALTER TABLE "contracts" ADD COLUMN "annualFee" DECIMAL(12,2);
ALTER TABLE "contracts" ADD COLUMN "userLimit" INTEGER;
