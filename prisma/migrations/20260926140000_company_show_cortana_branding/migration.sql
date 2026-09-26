-- Рекламен ред на CortanaSoft във фактура/оферта (opt-in по фирма)
ALTER TABLE "companies" ADD COLUMN "showCortanaBranding" BOOLEAN NOT NULL DEFAULT false;
