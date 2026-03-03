-- Migrate BI permissions in Role JSON: rename old page keys to new ones
-- Old: analytics, salesReports, financialReports, performance
-- New: sales, customers, products

-- For each role that has BI module enabled, replace the pages object
-- with the new 3 pages (sales, customers, products) all enabled with view action
UPDATE "roles"
SET "permissions" = jsonb_set(
  "permissions"::jsonb,
  '{modules,bi,pages}',
  '{"sales":{"enabled":true,"actions":{"view":true}},"customers":{"enabled":true,"actions":{"view":true}},"products":{"enabled":true,"actions":{"view":true}}}'::jsonb
)
WHERE "permissions"::jsonb #> '{modules,bi}' IS NOT NULL;
