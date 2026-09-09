-- Толеранс за недостиг на отработени часове за месеца (в минути);
-- под него човекът не се маркира в червено в матрицата на присъствията.
ALTER TABLE "hr_settings" ADD COLUMN "hoursToleranceMinutes" INTEGER NOT NULL DEFAULT 30;
