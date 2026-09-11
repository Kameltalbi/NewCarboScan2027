import {
  UK_DATASET_VERSION,
  UK_FLAT_VERSION,
  UK_REPORTING_YEAR,
  type UkCanonicalDto,
} from "./types.js";
import { UK_SOURCE_FILE_BASENAME } from "./fixedIds.js";

/** Stable JSON for seed bytes — sorted object keys, sorted array order preserved. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortKeys(obj[k]);
  }
  return out;
}

/**
 * Canonical metadata for UK factors (shared by live importer + seed generator).
 * source_file is always the official basename (never a host path).
 */
export function buildUkFactorMetadata(
  dto: UkCanonicalDto,
  fileSha256: string,
  sourceFile: string = UK_SOURCE_FILE_BASENAME,
): Record<string, unknown> {
  const basename = sourceFile.split(/[/\\]/).pop() || UK_SOURCE_FILE_BASENAME;
  return {
    migration_id: "uk_gov_ghg_2026_flat_1_2",
    checksum_algorithm: "sha256",
    checksum_version: "v2",
    normalization_status: dto.normalizationStatus,
    units: {
      original_unit: `${dto.originalGhgUnit} / ${dto.originalUom ?? ""}`.trim(),
      normalization_status: dto.normalizationStatus,
      qualifiers: dto.energyBasis ? [dto.energyBasis] : [],
    },
    taxonomy: {
      mapping_status: dto.taxonomyStatus,
      mapping_rule: dto.taxonomyRule,
    },
    temporal: {
      dataset_version: UK_DATASET_VERSION,
      reporting_year: UK_REPORTING_YEAR,
      factor_year: null,
    },
    geography: {
      mapping_rule: dto.geographyRule,
      source_hint: dto.level3 ?? dto.level2 ?? null,
    },
    provenance: {
      source_native_id: dto.externalCode,
      source_file: basename,
      source_file_sha256: fileSha256,
      dataset_version: UK_DATASET_VERSION,
      flat_version: UK_FLAT_VERSION,
      reporting_year: UK_REPORTING_YEAR,
      source_scope: dto.sourceScope,
      level_1: dto.level1,
      level_2: dto.level2,
      level_3: dto.level3,
      level_4: dto.level4,
      column_text: dto.columnText,
      original_value: dto.originalValue,
      original_uom: dto.originalUom,
      original_ghg_unit: dto.originalGhgUnit,
      lifecycle_mapping_rule: dto.lifecycleRule,
      gwp_mapping_rule: dto.gwpRule,
      geography_mapping_rule: dto.geographyRule,
      stem: dto.stem,
      transformations: [],
    },
    uk: {
      source_scope: dto.sourceScope,
      levels: {
        level1: dto.level1,
        level2: dto.level2,
        level3: dto.level3,
        level4: dto.level4,
      },
      ghg_components: dto.ghgComponents,
    },
  };
}
