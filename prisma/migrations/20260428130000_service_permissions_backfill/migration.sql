-- Backfill: добавя `service` модул в permissions JSON на всички съществуващи роли
-- които вече имат поне един друг модул. Така OWNER/Super Admin/Manager роли
-- автоматично получават достъп до новия Service модул.

UPDATE roles
SET permissions = jsonb_set(
  permissions::jsonb,
  '{modules,service}',
  '{
    "enabled": true,
    "pages": {
      "orders":    {"enabled": true, "actions": {"view": true, "create": true, "edit": true, "delete": true}},
      "assets":    {"enabled": true, "actions": {"view": true, "create": true, "edit": true, "delete": true}},
      "contracts": {"enabled": true, "actions": {"view": true, "create": true, "edit": true, "delete": true}},
      "calendar":  {"enabled": true, "actions": {"view": true}}
    }
  }'::jsonb
)
WHERE permissions::jsonb -> 'modules' IS NOT NULL
  AND NOT (permissions::jsonb -> 'modules' ? 'service');
