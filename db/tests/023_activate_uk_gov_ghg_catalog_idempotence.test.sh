#!/bin/sh
# Idempotence + inconsistent-state tests for 023 (uses transactions / restore).
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
CONTAINER=${POSTGRES_CONTAINER:-newcarboscan-postgres}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
MIG="$ROOT/db/migrations/023_activate_uk_gov_ghg_catalog.sql"

psql() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" "$@"
}

run_023() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG"
}

expect_fail_023() {
  if docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG" 2>&1; then
    echo "FAIL: expected 023 to reject state" >&2
    exit 1
  fi
}

restore_state_b() {
  psql -v ON_ERROR_STOP=1 -c "
    UPDATE emission_factor_versions v
    SET status = 'approved', catalog_status = 'visible',
        calculation_status = 'disabled', resolver_status = 'disabled'
    FROM factor_sources s
    WHERE s.id = v.source_id
      AND s.source_key = 'uk_gov_ghg'
      AND v.dataset_version = '2026-flat-1.2';

    UPDATE emission_factors f
    SET status = 'approved'
    FROM emission_factor_versions v
    JOIN factor_sources s ON s.id = v.source_id
    WHERE f.version_id = v.id
      AND s.source_key = 'uk_gov_ghg'
      AND v.dataset_version = '2026-flat-1.2';
  "
}

echo "=== Ensure state B baseline (activate if needed) ==="
run_023
echo "baseline OK"

echo "=== CAS 2: state B NO-OP ==="
run_023
echo "CAS 2 OK"

echo "=== CAS 1: state A → activate ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET status = 'draft', catalog_status = 'hidden',
      calculation_status = 'disabled', resolver_status = 'disabled'
  FROM factor_sources s
  WHERE s.id = v.source_id
    AND s.source_key = 'uk_gov_ghg'
    AND v.dataset_version = '2026-flat-1.2';

  UPDATE emission_factors f
  SET status = 'draft'
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE f.version_id = v.id
    AND s.source_key = 'uk_gov_ghg'
    AND v.dataset_version = '2026-flat-1.2';
"
run_023
psql -tAc "
  SELECT v.status || '|' || v.catalog_status || '|' || v.calculation_status || '|' || v.resolver_status
  FROM emission_factor_versions v
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
" | grep -q 'approved|visible|disabled|disabled' || {
  echo "CAS 1 FAIL: version not activated" >&2
  exit 1
}
psql -tAc "
  SELECT COUNT(*)::text FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2' AND f.status = 'approved'
" | grep -q '^2622$' || {
  echo "CAS 1 FAIL: factors not approved" >&2
  exit 1
}
echo "CAS 1 OK"

echo "=== CAS 2 again: second run NO-OP ==="
run_023
echo "CAS 2 (repeat) OK"

echo "=== CAS 3: approved/hidden → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET status = 'approved', catalog_status = 'hidden'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
expect_fail_023 || true
restore_state_b
echo "CAS 3 OK"

echo "=== CAS 4: draft/visible → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET status = 'draft', catalog_status = 'visible'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
expect_fail_023 || true
restore_state_b
echo "CAS 4 OK"

echo "=== CAS 5: calculation enabled → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET calculation_status = 'enabled'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
expect_fail_023 || true
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v SET calculation_status = 'disabled'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
restore_state_b
echo "CAS 5 OK"

echo "=== CAS 6: resolver enabled (with calc enabled) → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET resolver_status = 'enabled', calculation_status = 'enabled'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
expect_fail_023 || true
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET resolver_status = 'disabled', calculation_status = 'disabled'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
restore_state_b
echo "CAS 6 OK"

echo "=== CAS 7: approved/visible/enabled/disabled → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions v
  SET status = 'approved', catalog_status = 'visible',
      calculation_status = 'enabled', resolver_status = 'disabled'
  FROM factor_sources s
  WHERE s.id = v.source_id AND s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2';
"
expect_fail_023 || true
restore_state_b
echo "CAS 7 OK"

echo "All 023 idempotence / state-machine cases passed."
