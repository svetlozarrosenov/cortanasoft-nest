#!/bin/sh
set -e

# Baseline: if the database was created with `prisma db push` (no migration history),
# mark all pre-existing migrations as applied so `migrate deploy` doesn't try to re-run them.
# Only migrations up to BASELINE_UP_TO are marked — anything after will be deployed normally.
BASELINE_UP_TO="20260228100000_add_production_module"

APPLIED=$(npx prisma migrate status 2>&1 | grep -c "Database schema is up to date" || true)
if [ "$APPLIED" = "0" ]; then
  echo "First run detected — baselining existing migrations..."
  for dir in $(ls prisma/migrations/ | grep -v migration_lock | sort); do
    npx prisma migrate resolve --applied "$dir" 2>/dev/null || true
    if [ "$dir" = "$BASELINE_UP_TO" ]; then
      break
    fi
  done
  echo "Baseline complete. New migrations will be applied next."
fi

# One-time fix: the buggy entrypoint marked add_serial_to_order_item as applied
# without executing its SQL. Roll it back so migrate deploy can apply it properly.
# Safe to keep — if the migration is not marked as applied, this is a no-op.
npx prisma migrate resolve --rolled-back 20260301000000_add_serial_to_order_item 2>/dev/null || true

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/src/main
