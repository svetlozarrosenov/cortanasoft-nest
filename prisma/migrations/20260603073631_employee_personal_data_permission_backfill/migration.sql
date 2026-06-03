-- Backfill: добавя ново отделно право `employeePersonalData` (view/edit) за
-- личните данни/ЕГН в трудовото досие. Дава го на ролите, които вече имат
-- `employeeRecords`, за да запазят текущия достъп. Идемпотентно.

UPDATE roles
SET permissions = jsonb_set(
  permissions::jsonb,
  '{modules,hr,pages,employeePersonalData}',
  '{"enabled": true, "actions": {"view": true, "edit": true}}'::jsonb
)
WHERE permissions::jsonb #> '{modules,hr,pages}' ? 'employeeRecords'
  AND NOT (permissions::jsonb #> '{modules,hr,pages}' ? 'employeePersonalData');
