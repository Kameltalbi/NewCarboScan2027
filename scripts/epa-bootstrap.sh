#!/bin/sh
# Shared EPA Hub 2025 DATA bootstrap helpers for migrate.sh / migrate-docker.sh.
# shellcheck shell=sh

# Caller must define epa_psql() / epa_psql_file() and export EPA_SEED_SQL.

epa_bootstrap_state() {
  epa_psql -tAc "
    WITH epa AS (
      SELECT
        (SELECT COUNT(*) FROM factor_sources WHERE source_key = 'epa_ghg_emission_factors_hub') AS src_n,
        (SELECT COUNT(*) FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025') AS ver_n,
        (SELECT COUNT(*) FROM emission_factors f
           JOIN emission_factor_versions v ON v.id = f.version_id
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025') AS fac_n,
        (SELECT v.status || '/' || v.catalog_status || '/' || v.calculation_status || '/' || v.resolver_status
           FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'epa_ghg_emission_factors_hub' AND v.dataset_version = '2025'
          LIMIT 1) AS gov
    )
    SELECT CASE
      WHEN src_n = 0 AND ver_n = 0 AND fac_n = 0 THEN 'ABSENT'
      WHEN src_n = 1 AND ver_n = 1 AND fac_n = 1421 AND gov = 'draft/hidden/disabled/disabled' THEN 'OK'
      WHEN fac_n NOT IN (0, 1421) THEN 'PARTIAL:' || fac_n::text
      WHEN fac_n = 1421 AND gov IS DISTINCT FROM 'draft/hidden/disabled/disabled' THEN 'BAD_GOVERNANCE:' || coalesce(gov, 'missing')
      ELSE 'INCOHERENT'
    END
    FROM epa;
  " | tr -d '[:space:]'
}

ensure_epa_hub_2025_bootstrap() {
  if [ ! -f "$EPA_SEED_SQL" ]; then
    echo "ERROR: missing EPA DATA seed $EPA_SEED_SQL (required for 025)" >&2
    exit 1
  fi

  state=$(epa_bootstrap_state)
  case "$state" in
    ABSENT)
      echo "seed apply epa_ghg_emission_factors_hub_2025.sql (DATA bootstrap for 025)"
      epa_psql_file "$EPA_SEED_SQL"
      ;;
    OK)
      echo "seed skip epa_ghg_emission_factors_hub_2025 (EPA already present: 1421 draft/hidden/disabled/disabled)"
      ;;
    PARTIAL:*)
      echo "ERROR: EPA bootstrap partial state ($state) — refuse silent repair" >&2
      exit 1
      ;;
    BAD_GOVERNANCE:*)
      echo "ERROR: EPA bootstrap unexpected governance ($state)" >&2
      exit 1
      ;;
    *)
      echo "ERROR: EPA bootstrap incoherent state ($state)" >&2
      exit 1
      ;;
  esac
}
