#!/bin/sh
# Shared IPCC EFDB DATA bootstrap helpers for migrate.sh / migrate-docker.sh.
# shellcheck shell=sh

# Caller must define ipcc_psql() / ipcc_psql_file() and export IPCC_EFDB_SEED_SQL.

ipcc_efdb_bootstrap_state() {
  ipcc_psql -tAc "
    WITH ipcc AS (
      SELECT
        (SELECT COUNT(*) FROM factor_sources WHERE source_key = 'ipcc_efdb') AS src_n,
        (SELECT COUNT(*) FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09') AS ver_n,
        (SELECT COUNT(*) FROM emission_factors f
           JOIN emission_factor_versions v ON v.id = f.version_id
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09') AS fac_n,
        (SELECT COUNT(*) FROM ipcc_efdb_records) AS rec_n,
        (SELECT v.status || '/' || v.catalog_status || '/' || v.calculation_status || '/' || v.resolver_status
           FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'ipcc_efdb' AND v.dataset_version = 'efdb_snapshot_2026_09'
          LIMIT 1) AS gov
    )
    SELECT CASE
      WHEN src_n = 0 AND ver_n = 0 AND fac_n = 0 AND rec_n = 0 THEN 'ABSENT'
      WHEN src_n = 1 AND ver_n = 1 AND fac_n = 778 AND rec_n = 27566
           AND gov = 'draft/hidden/disabled/disabled' THEN 'OK'
      WHEN src_n = 1 AND ver_n = 1 AND fac_n = 778 AND rec_n = 27566
           AND gov IN (
             'approved/visible/disabled/disabled',
             'approved/visible/enabled/enabled'
           ) THEN 'OK_ACTIVATED'
      WHEN fac_n NOT IN (0, 778) OR rec_n NOT IN (0, 27566) THEN 'PARTIAL:fac=' || fac_n::text || ',rec=' || rec_n::text
      WHEN fac_n = 778 AND rec_n = 27566 THEN 'BAD_GOVERNANCE:' || coalesce(gov, 'missing')
      ELSE 'INCOHERENT'
    END
    FROM ipcc;
  " | tr -d '[:space:]'
}

ensure_ipcc_efdb_bootstrap() {
  if [ ! -f "$IPCC_EFDB_SEED_SQL" ]; then
    echo "ERROR: missing IPCC EFDB DATA seed $IPCC_EFDB_SEED_SQL (required for 028)" >&2
    exit 1
  fi

  # Staging table may not exist yet on ABSENT — probe carefully
  has_table=$(ipcc_psql -tAc "SELECT to_regclass('public.ipcc_efdb_records') IS NOT NULL" | tr -d '[:space:]')
  if [ "$has_table" != "t" ]; then
    echo "seed apply ipcc_efdb.sql (DATA bootstrap for 028)"
    ipcc_psql_file "$IPCC_EFDB_SEED_SQL"
    return 0
  fi

  state=$(ipcc_efdb_bootstrap_state)
  case "$state" in
    ABSENT)
      echo "seed apply ipcc_efdb.sql (DATA bootstrap for 028)"
      ipcc_psql_file "$IPCC_EFDB_SEED_SQL"
      ;;
    OK|OK_ACTIVATED)
      echo "seed skip ipcc_efdb (IPCC EFDB already present: $state)"
      ;;
    PARTIAL:*)
      echo "ERROR: IPCC EFDB bootstrap partial state ($state) — refuse silent repair" >&2
      exit 1
      ;;
    BAD_GOVERNANCE:*)
      echo "ERROR: IPCC EFDB bootstrap unexpected governance ($state)" >&2
      exit 1
      ;;
    *)
      echo "ERROR: IPCC EFDB bootstrap incoherent state ($state)" >&2
      exit 1
      ;;
  esac
}
