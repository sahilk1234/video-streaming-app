#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

echo "Waiting for database..."
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
  sleep 1
done

RUN_DB_SEED=${RUN_DB_SEED:-true}
RUN_DEMO_DOWNLOAD=${RUN_DEMO_DOWNLOAD:-false}

echo "Running migrations..."
npm run db:migrate

if [ "$RUN_DEMO_DOWNLOAD" = "true" ]; then
  echo "Downloading demo videos..."
  npm run demo:videos
fi
if [ "$RUN_DB_SEED" = "true" ]; then
  echo "Checking for seed data..."
  SEED_CHECK=$(psql "$DATABASE_URL" -tAc 'SELECT 1 FROM "User" LIMIT 1;')
  if [ -z "$SEED_CHECK" ]; then
    echo "Seeding database..."
    npm run db:seed
  else
    echo "Seed data already present; skipping."
  fi
fi

exec "$@"
