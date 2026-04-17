#!/bin/sh
set -e

# Apply any pending Prisma migrations. Safe for production:
# - Reads migration files from prisma/migrations/ in order
# - Tracks applied migrations in the `_prisma_migrations` table
# - Fails loudly on schema drift instead of silently destroying data
# - Each migration runs in a transaction; on failure nothing is committed
echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node dist/src/main
