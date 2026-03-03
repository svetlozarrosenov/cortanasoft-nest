#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Running data migrations..."
npx prisma db execute --stdin <<'SQL'
-- Migrate BI permissions: rename old page keys to new ones
UPDATE "roles"
SET "permissions" = jsonb_set(
  "permissions"::jsonb,
  '{modules,bi,pages}',
  '{"sales":{"enabled":true,"actions":{"view":true}},"customers":{"enabled":true,"actions":{"view":true}},"products":{"enabled":true,"actions":{"view":true}}}'::jsonb
)
WHERE "permissions"::jsonb #> '{modules,bi}' IS NOT NULL
  AND "permissions"::jsonb #> '{modules,bi,pages,sales}' IS NULL;
SQL

echo "Starting application..."
exec node dist/src/main
