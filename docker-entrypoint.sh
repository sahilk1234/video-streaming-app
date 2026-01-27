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
S3_READY=true
if [ -z "$S3_ENDPOINT" ] || [ -z "$S3_BUCKET" ] || [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
  S3_READY=false
fi

EFFECTIVE_STORAGE="$MEDIA_STORAGE"
if [ "$MEDIA_STORAGE" = "s3" ] && [ "$S3_READY" != "true" ]; then
  echo "S3 config incomplete; falling back to local storage."
  EFFECTIVE_STORAGE="local"
fi

if [ "$RUN_DEMO_DOWNLOAD" = "true" ] && [ "$EFFECTIVE_STORAGE" = "local" ]; then
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
  echo "Demo download skipped (storage=$EFFECTIVE_STORAGE)"
fi

export MEDIA_STORAGE="$EFFECTIVE_STORAGE"
echo "Starting application..."
exec "$@"
