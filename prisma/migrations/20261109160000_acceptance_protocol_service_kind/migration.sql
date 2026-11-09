-- Приемо-предавателен протокол по сервизна заявка: приемен или предавателен.
ALTER TABLE "acceptance_protocols" ADD COLUMN "serviceKind" TEXT;

-- Старите сервизни протоколи: видът е в бележката („Приемен протокол по…“ / „Предавателен протокол по…“).
UPDATE "acceptance_protocols" SET "serviceKind" = 'intake'
WHERE "serviceOrderId" IS NOT NULL AND "serviceKind" IS NULL AND "notes" LIKE 'Приемен протокол%';
UPDATE "acceptance_protocols" SET "serviceKind" = 'handover'
WHERE "serviceOrderId" IS NOT NULL AND "serviceKind" IS NULL AND "notes" LIKE 'Предавателен протокол%';
