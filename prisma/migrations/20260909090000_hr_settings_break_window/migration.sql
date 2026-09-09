-- Почивката в HR настройките става прозорец „от–до" вместо минути.
-- Съществуващите стойности се пренасят като 12:00 + досегашната дължина;
-- 0 минути = без почивка (NULL).
ALTER TABLE "hr_settings" ADD COLUMN "breakStart" TEXT DEFAULT '12:00';
ALTER TABLE "hr_settings" ADD COLUMN "breakEnd" TEXT DEFAULT '13:00';

UPDATE "hr_settings"
SET "breakStart" = CASE WHEN "breakMinutes" > 0 THEN '12:00' END,
    "breakEnd" = CASE
      WHEN "breakMinutes" > 0
        THEN to_char((TIME '12:00' + ("breakMinutes" * INTERVAL '1 minute')), 'HH24:MI')
    END;

ALTER TABLE "hr_settings" DROP COLUMN "breakMinutes";
