import type { EpaCanonicalDto } from "./types.js";
import { EPA_DATASET_VERSION, EPA_REPORTING_YEAR } from "./types.js";

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k]);
    return out;
  }
  return value;
}

export function buildEpaFactorMetadata(
  dto: EpaCanonicalDto,
  sourceFileSha256: string,
  sourceFileBasename: string,
): Record<string, unknown> {
  return {
    migration_id: "epa_ghg_emission_factors_hub_2025",
    checksum_algorithm: "sha256",
    checksum_version: "v2",
    normalization_status: dto.geographicApplicability === "REQUIRES_REVIEW" ? "review_required" : "ok",
    units: {
      original_unit: `${dto.unitNumerator} / ${dto.unitDenominator}`,
      normalization_status: "preserved",
      qualifiers: [],
    },
    taxonomy: {
      mapping_status: "mapped",
      mapping_rule: "epa_hub_2025_table_category",
    },
    temporal: {
      dataset_version: EPA_DATASET_VERSION,
      reporting_year: EPA_REPORTING_YEAR,
      factor_year: EPA_REPORTING_YEAR,
    },
    geography: {
      mapping_rule: dto.geographicApplicability,
      geographic_applicability: dto.geographicApplicability,
      source_hint: dto.countryCode,
    },
    provenance: {
      source_native_id: dto.stableFactorId,
      source_file: sourceFileBasename,
      source_file_sha256: sourceFileSha256,
      table_number: dto.table,
      table_name: dto.tableName,
      original_value: dto.originalValue,
      original_uom: dto.unitDenominator,
      original_ghg_unit: dto.unitNumerator,
      transformations: dto.derived ? ["derived_co2e_ar5"] : [],
    },
    epa: {
      gas: dto.gas,
      derived: dto.derived,
      derived_formula: dto.derivedFormula,
      derived_from_stems: dto.derivedFromStems,
      dims: dto.dims,
      official_url: "https://www.epa.gov/climateleadership/ghg-emission-factors-hub",
    },
  };
}
