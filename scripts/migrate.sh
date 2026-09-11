#!/bin/sh
# Applique db/migrations/0*.sql dans l'ordre, une seule fois chacune.
# Compatible ash/dash (image postgres:alpine).
#
# SCHEMA bootstrap : migrations 0*.sql → schema_migrations.filename (basename)
# DATA bootstrap   : db/seeds/emission_factors_legacy.sql avant 016 si legacy ADEME vide
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
MIG_DIR=${MIG_DIR:-"$ROOT/db/migrations"}
SEED_LEGACY=${SEED_LEGACY:-"$ROOT/db/seeds/emission_factors_legacy.sql"}

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

ensure_legacy_seed() {
  if [ ! -f "$SEED_LEGACY" ]; then
    echo "ERROR: missing DATA seed $SEED_LEGACY (required before 016)" >&2
    exit 1
  fi
  ademe_count=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT COUNT(*) FROM emission_factors_legacy WHERE source = 'ADEME Base Carbone v23.9'" 2>/dev/null || echo "0")
  ademe_count=$(echo "$ademe_count" | tr -d '[:space:]')
  if [ -z "$ademe_count" ]; then
    ademe_count=0
  fi
  if [ "$ademe_count" -gt 0 ]; then
    echo "seed skip emission_factors_legacy (ADEME v23.9 already present: $ademe_count)"
    return 0
  fi
  echo "seed apply emission_factors_legacy.sql (DATA bootstrap before 016)"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SEED_LEGACY"
}

# shellcheck disable=SC2012
for f in $(ls "$MIG_DIR"/0*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  applied=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT 1 FROM schema_migrations WHERE filename = '$name'")
  if [ "$applied" = "1" ]; then
    echo "skip $name"
    continue
  fi
  if [ "$name" = "016_migrate_ademe_base_carbone_v239.sql" ]; then
    ensure_legacy_seed
  fi
  echo "apply $name"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$f"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "Migrations complete."
