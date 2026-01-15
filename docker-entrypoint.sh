#!/bin/sh
set -e

echo "Waiting for database..."
until psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; do
  sleep 2
done

echo "Running migrations..."
npm run db:migrate

# -----------------------------
# Database seed
# -----------------------------
RUN_DB_SEED=${RUN_DB_SEED:-true}

if [ "$RUN_DB_SEED" = "true" ]; then
  SEED_EXISTS=$(psql "$DATABASE_URL" -tAc 'SELECT 1 FROM "User" LIMIT 1;')
  if [ -z "$SEED_EXISTS" ]; then
    echo "Seeding database..."
    npm run db:seed
  else
    echo "Seed data already present; skipping."
  fi
fi

# -----------------------------
# Demo download (LOCAL ONLY)
# -----------------------------
RUN_DEMO_DOWNLOAD=${RUN_DEMO_DOWNLOAD:-false}
MEDIA_STORAGE=${MEDIA_STORAGE:-local}
DEMO_MARKER="/app/storage/.demo_downloaded"

if [ "$RUN_DEMO_DOWNLOAD" = "true" ] && [ "$MEDIA_STORAGE" = "local" ]; then
  if [ ! -f "$DEMO_MARKER" ]; then
    echo "Downloading demo content (local storage)..."
    npm run demo:videos
    mkdir -p "$(dirname "$DEMO_MARKER")"
    touch "$DEMO_MARKER"
    echo "Demo download completed."
  else
    echo "Demo content already downloaded; skipping."
  fi
else
  echo "Demo download skipped (storage=$MEDIA_STORAGE)"
fi

echo "Starting application..."
exec "$@"
