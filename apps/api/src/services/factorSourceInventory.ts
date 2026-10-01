/**
 * Inventaire des bases réellement enregistrées (ABC-06).
 * Le sous-ensemble de calcul est le même prédicat que le résolveur.
 * PCAF n'est pas une base de facteurs du bilan corporate.
 */
import type { Pool } from "pg";
import { PRODUCTION_SAFE_FACTOR_SQL } from "./factorResolver/productionSafeSubset.js";

export interface FactorSourceVersionRow {
  sourceKey: string;
  name: string;
  license: string | null;
  publisher: string | null;
  homepage: string | null;
  versionLabel: string | null;
  datasetVersion: string | null;
  publishedYear: number | null;
  validFrom: string | null;
  gwpSet: string | null;
  status: string | null;
  catalogStatus: string | null;
  calculationStatus: string | null;
  resolverStatus: string | null;
  notes: string | null;
  factorCount: number;
  calculableCount: number;
}

export async function listFactorSourceInventory(db: Pool): Promise<FactorSourceVersionRow[]> {
  const { rows } = await db.query<FactorSourceVersionRow>(
    `SELECT
       s.source_key AS "sourceKey",
       s.name,
       s.license,
       s.publisher,
       s.homepage,
       v.version_label AS "versionLabel",
       v.dataset_version AS "datasetVersion",
       v.published_year AS "publishedYear",
       v.valid_from::text AS "validFrom",
       v.gwp_set AS "gwpSet",
       v.status,
       v.catalog_status AS "catalogStatus",
       v.calculation_status AS "calculationStatus",
       v.resolver_status AS "resolverStatus",
       v.notes,
       COUNT(f.id)::int AS "factorCount",
       COUNT(f.id) FILTER (WHERE ${PRODUCTION_SAFE_FACTOR_SQL})::int AS "calculableCount"
     FROM factor_sources s
     LEFT JOIN emission_factor_versions v ON v.source_id = s.id
     LEFT JOIN emission_factors f ON f.version_id = v.id
     WHERE s.source_key IS NOT NULL
       AND s.source_key <> 'pcaf'
     GROUP BY s.id, v.id
     ORDER BY s.source_key, v.dataset_version`,
  );
  return rows;
}
