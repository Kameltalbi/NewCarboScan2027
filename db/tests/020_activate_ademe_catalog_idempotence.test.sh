#!/bin/sh
# Idempotence + inconsistent-state tests for 020 (uses transactions / restore).
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
CONTAINER=${POSTGRES_CONTAINER:-newcarboscan-postgres}
PGUSER=${PGUSER:-newcarboscan}
PGDATABASE=${PGDATABASE:-newcarboscan}
MIG="$ROOT/db/migrations/020_activate_ademe_catalog.sql"

psql() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" "$@"
}

run_020() {
  docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG"
}

expect_fail_020() {
  if docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 < "$MIG" 2>&1; then
    echo "FAIL: expected 020 to reject state" >&2
    exit 1
  fi
}

restore_state_b() {
  psql -v ON_ERROR_STOP=1 -c "
    UPDATE emission_factor_versions
    SET status = 'approved', catalog_status = 'visible',
        calculation_status = 'disabled', resolver_status = 'disabled'
    WHERE dataset_version = '23.9' AND version_label = '23.9';
  "
}

echo "=== CAS 2: state B NO-OP ==="
run_020
echo "CAS 2 OK"

echo "=== CAS 1: state A → activate ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET status = 'draft', catalog_status = 'hidden'
  WHERE dataset_version = '23.9' AND version_label = '23.9';
"
run_020
psql -tAc "SELECT status, catalog_status FROM emission_factor_versions WHERE dataset_version='23.9'" | grep -q 'approved|visible' || {
  echo "CAS 1 FAIL: not activated" >&2
  exit 1
}
echo "CAS 1 OK"

echo "=== CAS 2 again: second run NO-OP ==="
run_020
echo "CAS 2 (repeat) OK"

echo "=== CAS 3: approved/hidden → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET status = 'approved', catalog_status = 'hidden'
  WHERE dataset_version = '23.9';
"
expect_fail_020 || true
restore_state_b
echo "CAS 3 OK"

echo "=== CAS 4: draft/visible → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET status = 'draft', catalog_status = 'visible'
  WHERE dataset_version = '23.9';
"
expect_fail_020 || true
restore_state_b
echo "CAS 4 OK"

echo "=== CAS 5: calculation enabled → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET calculation_status = 'enabled'
  WHERE dataset_version = '23.9';
"
expect_fail_020 || true
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions SET calculation_status = 'disabled'
  WHERE dataset_version = '23.9';
"
restore_state_b
echo "CAS 5 OK"

echo "=== CAS 6: resolver enabled → FAIL ==="
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET resolver_status = 'enabled', calculation_status = 'enabled'
  WHERE dataset_version = '23.9';
"
expect_fail_020 || true
psql -v ON_ERROR_STOP=1 -c "
  UPDATE emission_factor_versions
  SET resolver_status = 'disabled', calculation_status = 'disabled'
  WHERE dataset_version = '23.9';
"
restore_state_b
echo "CAS 6 OK"

echo "All 020 idempotence cases passed."
