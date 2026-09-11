#!/bin/sh
# Applique db/migrations/0*.sql via le container Postgres (évite psql hôte
# et les bind-mounts Docker parfois vides sur /Volumes/...).
#
# SCHEMA bootstrap : db/migrations/0*.sql (enregistré dans schema_migrations.filename)
# DATA bootstrap   :
#   - db/seeds/emission_factors_legacy.sql avant 016 si 0 ligne ADEME v23.9 en legacy
#   - db/seeds/uk_gov_ghg_2026_flat_1_2.sql pour 022 (UK draft/hidden)
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CONTAINER=${POSTGRES_CONTAINER:-newcarboscan-postgres}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
SEED_LEGACY="$ROOT/db/seeds/emission_factors_legacy.sql"
UK_SEED_SQL="$ROOT/db/seeds/uk_gov_ghg_2026_flat_1_2.sql"
export UK_SEED_SQL

# shellcheck disable=SC1091
. "$ROOT/scripts/uk-bootstrap.sh"

uk_psql() {
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" "$@"
}

uk_psql_file() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$1"
  return $?
}

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

  if [ "$name" = "022_bootstrap_uk_gov_ghg_2026.sql" ]; then
    ensure_uk_gov_ghg_bootstrap
  fi

  echo "apply $name"
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$f"
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "Migrations complete."
