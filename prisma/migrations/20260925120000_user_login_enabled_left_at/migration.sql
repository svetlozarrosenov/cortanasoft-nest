-- Служители без достъп (създадени от фирмата в HR > Служители):
-- loginEnabled=false отказва вход/парола/JWT; leftAt е само за информация;
-- workEmail е служебният имейл на фирмата, уникален в нейните рамки.
ALTER TABLE "users" ADD COLUMN "loginEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_companies" ADD COLUMN "leftAt" TIMESTAMP(3);
ALTER TABLE "user_companies" ADD COLUMN "workEmail" TEXT;
CREATE UNIQUE INDEX "user_companies_companyId_workEmail_key" ON "user_companies"("companyId", "workEmail");
