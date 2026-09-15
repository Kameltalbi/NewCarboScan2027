#!/bin/sh
# Applique db/migrations/0*.sql dans l'ordre, une seule fois chacune.
# Compatible ash/dash (image postgres:alpine).
#
# SCHEMA bootstrap : migrations 0*.sql → schema_migrations.filename (basename)
# DATA bootstrap   :
#   - db/seeds/emission_factors_legacy.sql avant 016 si legacy ADEME vide
#   - db/seeds/uk_gov_ghg_2026_flat_1_2.sql pour 022 (UK draft, hidden)
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT=${ROOT:-$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)}
MIG_DIR=${MIG_DIR:-"$ROOT/db/migrations"}
SEED_LEGACY=${SEED_LEGACY:-"$ROOT/db/seeds/emission_factors_legacy.sql"}
UK_SEED_SQL=${UK_SEED_SQL:-"$ROOT/db/seeds/uk_gov_ghg_2026_flat_1_2.sql"}
EPA_SEED_SQL=${EPA_SEED_SQL:-"$ROOT/db/seeds/epa_ghg_emission_factors_hub_2025.sql"}
IPCC_EFDB_SEED_SQL=${IPCC_EFDB_SEED_SQL:-"$ROOT/db/seeds/ipcc_efdb.sql"}

PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
PGPASSWORD=${PGPASSWORD:-${POSTGRES_PASSWORD:-newcarboscan}}
export PGPASSWORD
export UK_SEED_SQL
export EPA_SEED_SQL
export IPCC_EFDB_SEED_SQL

# shellcheck disable=SC1091
# Source from this script's directory so Docker mount /scripts/migrate.sh works.
. "$SCRIPT_DIR/uk-bootstrap.sh"
. "$SCRIPT_DIR/epa-bootstrap.sh"
. "$SCRIPT_DIR/ipcc-efdb-bootstrap.sh"

uk_psql() {
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
}

uk_psql_file() {
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$1"
}

epa_psql() { uk_psql "$@"; }
epa_psql_file() { uk_psql_file "$@"; }
ipcc_psql() { uk_psql "$@"; }
ipcc_psql_file() { uk_psql_file "$@"; }

echo "Waiting for Postgres at $PGHOST:$PGPORT..."
i=1
while [ "$i" -le 60 ]; do
  if uk_psql -c "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Postgres unavailable" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done

uk_psql -v ON_ERROR_STOP=1 <<'SQL'
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
  ademe_count=$(uk_psql -tAc \
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
  uk_psql -v ON_ERROR_STOP=1 -f "$SEED_LEGACY"
}

# shellcheck disable=SC2012
for f in $(ls "$MIG_DIR"/0*.sql 2>/dev/null | sort); do
  name=$(basename "$f")
  applied=$(uk_psql -tAc \
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
  if [ "$name" = "025_bootstrap_epa_ghg_hub_2025.sql" ]; then
    ensure_epa_hub_2025_bootstrap
  fi
  if [ "$name" = "028_bootstrap_ipcc_efdb.sql" ]; then
    ensure_ipcc_efdb_bootstrap
  fi
  echo "apply $name"
  uk_psql -v ON_ERROR_STOP=1 -f "$f"
  uk_psql -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "Migrations complete."

echo "Configure role ncs_app..."
uk_psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ncs_app') THEN
    CREATE ROLE ncs_app LOGIN PASSWORD '${PGPASSWORD}';
  ELSE
    ALTER ROLE ncs_app LOGIN PASSWORD '${PGPASSWORD}';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE ${PGDATABASE} TO ncs_app;
GRANT USAGE ON SCHEMA public TO ncs_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ncs_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ncs_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ncs_app;
SQL

