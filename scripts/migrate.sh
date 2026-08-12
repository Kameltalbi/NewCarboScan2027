#!/bin/sh
# Applique db/migrations/00*.sql dans l'ordre, une seule fois chacune.
# Compatible ash/dash (image postgres:alpine).
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
MIG_DIR=${MIG_DIR:-"$ROOT/db/migrations"}

PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
PGPASSWORD=${PGPASSWORD:-${POSTGRES_PASSWORD:-newcarboscan}}
export PGPASSWORD

echo "Waiting for Postgres at $PGHOST:$PGPORT..."
i=1
while [ "$i" -le 60 ]; do
  if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Postgres unavailable" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

# shellcheck disable=SC2012
for f in $(ls "$MIG_DIR"/0*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  applied=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT 1 FROM schema_migrations WHERE filename = '$name'")
  if [ "$applied" = "1" ]; then
    echo "skip $name"
    continue
  fi
  echo "apply $name"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$f"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "Migrations complete."
