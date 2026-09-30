-- Държава Израел за формите на клиенти и доставчици (Нидерландия вече съществува)
INSERT INTO "countries" ("id", "code", "name", "nativeName", "phoneCode", "isEU", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'IL', 'Israel', 'ישראל', '+972', false, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
