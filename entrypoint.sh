#!/bin/sh
set -e

# Baseline: mark all migrations as applied if this is the first run
# (database was created with `prisma db push`, not migrations)
APPLIED=$(npx prisma migrate status 2>&1 | grep -c "Database schema is up to date" || true)
if [ "$APPLIED" = "0" ]; then
  echo "First run detected — baselining existing migrations..."
  for dir in $(ls prisma/migrations/ | grep -v migration_lock); do
    npx prisma migrate resolve --applied "$dir" 2>/dev/null || true
  done
  echo "Baseline complete."
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/src/main
