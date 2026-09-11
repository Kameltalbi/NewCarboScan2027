#!/bin/sh
# Shared UK 2026 DATA bootstrap helpers for migrate.sh / migrate-docker.sh.
# shellcheck shell=sh

# Caller must define uk_psql() and export UK_SEED_SQL.

uk_bootstrap_state() {
  # Prints: ABSENT | OK | PARTIAL:<n> | BAD_GOVERNANCE:... | INCOHERENT
  uk_psql -tAc "
    WITH uk AS (
      SELECT
        (SELECT COUNT(*) FROM factor_sources WHERE source_key = 'uk_gov_ghg') AS src_n,
        (SELECT COUNT(*) FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2') AS ver_n,
        (SELECT COUNT(*) FROM emission_factors f
           JOIN emission_factor_versions v ON v.id = f.version_id
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2') AS fac_n,
        (SELECT v.status || '/' || v.catalog_status || '/' || v.calculation_status || '/' || v.resolver_status
           FROM emission_factor_versions v
           JOIN factor_sources s ON s.id = v.source_id
          WHERE s.source_key = 'uk_gov_ghg' AND v.dataset_version = '2026-flat-1.2'
          LIMIT 1) AS gov
    )
    SELECT CASE
      WHEN src_n = 0 AND ver_n = 0 AND fac_n = 0 THEN 'ABSENT'
      WHEN src_n = 1 AND ver_n = 1 AND fac_n = 2622 AND gov = 'draft/hidden/disabled/disabled' THEN 'OK'
      WHEN fac_n NOT IN (0, 2622) THEN 'PARTIAL:' || fac_n::text
      WHEN fac_n = 2622 AND gov IS DISTINCT FROM 'draft/hidden/disabled/disabled' THEN 'BAD_GOVERNANCE:' || coalesce(gov, 'missing')
      ELSE 'INCOHERENT'
    END
    FROM uk;
  " | tr -d '[:space:]'
}

ensure_uk_gov_ghg_bootstrap() {
  if [ ! -f "$UK_SEED_SQL" ]; then
    echo "ERROR: missing UK DATA seed $UK_SEED_SQL (required for 022)" >&2
    exit 1
  fi

  state=$(uk_bootstrap_state)
  case "$state" in
    ABSENT)
      echo "seed apply uk_gov_ghg_2026_flat_1_2.sql (DATA bootstrap for 022)"
      uk_psql_file "$UK_SEED_SQL"
      ;;
    OK)
      echo "seed skip uk_gov_ghg_2026_flat_1_2 (UK already present: 2622 draft/hidden/disabled/disabled)"
      ;;
    PARTIAL:*)
      echo "ERROR: UK bootstrap partial state ($state) — refuse silent repair" >&2
      exit 1
      ;;
    BAD_GOVERNANCE:*)
      echo "ERROR: UK bootstrap unexpected governance before 023 ($state)" >&2
      exit 1
      ;;
    *)
      echo "ERROR: UK bootstrap incoherent state ($state)" >&2
      exit 1
      ;;
  esac
}
