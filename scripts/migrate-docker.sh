#!/bin/sh
# Applique db/migrations/0*.sql via le container Postgres (évite psql hôte
# et les bind-mounts Docker parfois vides sur /Volumes/...).
#
# SCHEMA bootstrap : db/migrations/0*.sql (enregistré dans schema_migrations.filename)
# DATA bootstrap   : db/seeds/emission_factors_legacy.sql
#   → chargé automatiquement une fois, avant 016, si 0 ligne ADEME v23.9 en legacy
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CONTAINER=${POSTGRES_CONTAINER:-newcarboscan-postgres}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
SEED_LEGACY="$ROOT/db/seeds/emission_factors_legacy.sql"

if ! docker exec "$CONTAINER" pg_isready -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; then
  echo "Container $CONTAINER not ready. Run: npm run db:up" >&2
  exit 1
fi

docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

ensure_legacy_seed() {
  # DATA bootstrap before 016 — not recorded as a schema migration.
  if [ ! -f "$SEED_LEGACY" ]; then
    echo "ERROR: missing DATA seed $SEED_LEGACY (required before 016)" >&2
    exit 1
  fi
  ademe_count=$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -tAc \
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
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$SEED_LEGACY"
}

# shellcheck disable=SC2045
for f in $(ls "$ROOT"/db/migrations/0*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  applied=$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -tAc \
    "SELECT 1 FROM schema_migrations WHERE filename = '$name'")
  if [ "$applied" = "1" ]; then
    echo "skip $name"
    continue
  fi

  if [ "$name" = "016_migrate_ademe_base_carbone_v239.sql" ]; then
    ensure_legacy_seed
  fi

  echo "apply $name"
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$f"
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "Migrations complete."
