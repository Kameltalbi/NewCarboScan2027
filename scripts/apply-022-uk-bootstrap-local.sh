#!/bin/sh
# Apply ONLY 022 UK bootstrap against the current DB (skip if already OK).
# Used for local DB that already has UK from the XLSX importer and a lagging
# schema_migrations journal (016–020 may be missing). Does NOT run 016–021.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CONTAINER=${POSTGRES_CONTAINER:-newcarboscan-postgres}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
UK_SEED_SQL="$ROOT/db/seeds/uk_gov_ghg_2026_flat_1_2.sql"
export UK_SEED_SQL

# shellcheck disable=SC1091
. "$ROOT/scripts/uk-bootstrap.sh"

uk_psql() {
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" "$@"
}

uk_psql_file() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$1"
}

name="022_bootstrap_uk_gov_ghg_2026.sql"
applied=$(uk_psql -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$name'" | tr -d '[:space:]')
if [ "$applied" = "1" ]; then
  echo "skip $name (already in schema_migrations)"
  exit 0
fi

ensure_uk_gov_ghg_bootstrap
echo "apply $name"
uk_psql_file "$ROOT/db/migrations/$name"
uk_psql -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
echo "022 local bootstrap journal recorded."
