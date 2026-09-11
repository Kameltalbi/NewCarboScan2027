#!/usr/bin/env bash
# Apply 021 via migrate runner path (or direct if 016–020 already present but
# not recorded), then run SQL tests. READ/WRITE local DB only — no deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTAINER="${POSTGRES_CONTAINER:-newcarboscan-postgres}"
PGUSER="${PGUSER:-newcarboscan}"
PGDATABASE="${PGDATABASE:-newcarboscan}"
MIG="$ROOT/db/migrations/021_canonical_factor_semantics.sql"
TEST="$ROOT/db/tests/021_canonical_factor_semantics.test.sql"

echo "== before =="
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 'registry' AS k, COUNT(*)::text AS n FROM emission_factors
UNION ALL SELECT 'ademe', COUNT(*)::text FROM emission_factors f
 JOIN emission_factor_versions v ON v.id=f.version_id
 JOIN factor_sources s ON s.id=v.source_id WHERE s.source_key='ademe'
UNION ALL SELECT 'internal', COUNT(*)::text FROM emission_factors f
 JOIN emission_factor_versions v ON v.id=f.version_id
 JOIN factor_sources s ON s.id=v.source_id WHERE s.source_key='internal';
"

applied=$(docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT 1 FROM schema_migrations WHERE filename = '021_canonical_factor_semantics.sql'" | tr -d '[:space:]')

if [ "$applied" = "1" ]; then
  echo "021 already in schema_migrations — re-running SQL (idempotent)"
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG"
else
  echo "Applying 021_canonical_factor_semantics.sql"
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG"
  docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO schema_migrations (filename) VALUES ('021_canonical_factor_semantics.sql') ON CONFLICT DO NOTHING;"
fi

echo "== tests =="
docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$TEST"

echo "== after =="
docker exec "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -c "
SELECT 'registry' AS k, COUNT(*)::text AS n FROM emission_factors
UNION ALL SELECT 'ademe', COUNT(*)::text FROM emission_factors f
 JOIN emission_factor_versions v ON v.id=f.version_id
 JOIN factor_sources s ON s.id=v.source_id WHERE s.source_key='ademe'
UNION ALL SELECT 'internal', COUNT(*)::text FROM emission_factors f
 JOIN emission_factor_versions v ON v.id=f.version_id
 JOIN factor_sources s ON s.id=v.source_id WHERE s.source_key='internal';
SELECT s.source_key, v.status, v.catalog_status, v.calculation_status, v.resolver_status
FROM emission_factor_versions v JOIN factor_sources s ON s.id=v.source_id
WHERE s.source_key IN ('ademe','internal') ORDER BY 1;
"

echo "OK 021"
