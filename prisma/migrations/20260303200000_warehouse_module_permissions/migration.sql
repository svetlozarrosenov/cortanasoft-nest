-- Move inventory, locations, goodsReceipts permissions from erp module to new warehouse module
-- This ensures existing roles keep their permissions after the menu restructuring

UPDATE "roles"
SET "permissions" = jsonb_set(
  jsonb_set(
    "permissions"::jsonb,
    '{modules,warehouse}',
    jsonb_build_object(
      'enabled', COALESCE("permissions"::jsonb #> '{modules,erp,enabled}', 'true'::jsonb),
      'pages', jsonb_build_object(
        'inventory', COALESCE("permissions"::jsonb #> '{modules,erp,pages,inventory}', '{"enabled":true,"actions":{"view":true,"create":true,"edit":true,"delete":true}}'::jsonb),
        'locations', COALESCE("permissions"::jsonb #> '{modules,erp,pages,locations}', '{"enabled":true,"actions":{"view":true,"create":true,"edit":true,"delete":true}}'::jsonb),
        'goodsReceipts', COALESCE("permissions"::jsonb #> '{modules,erp,pages,goodsReceipts}', '{"enabled":true,"actions":{"view":true,"create":true,"edit":true,"delete":true}}'::jsonb)
      )
    )
  ),
  '{modules,erp,pages}',
  ("permissions"::jsonb #> '{modules,erp,pages}') - 'inventory' - 'locations' - 'goodsReceipts'
)
WHERE "permissions"::jsonb #> '{modules,erp}' IS NOT NULL;
