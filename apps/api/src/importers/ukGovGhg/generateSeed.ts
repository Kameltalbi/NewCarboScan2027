/**
 * Deterministic UK GHG 2026 seed generator.
 * Produces db/seeds/uk_gov_ghg_2026_flat_1_2.sql from the official XLSX
 * using the same adapter as the live importer (no duplicated mapping rules).
 */
import { createHash } from "node:crypto";
import { buildUkFactorMetadata, stableStringify } from "./buildMetadata.js";
import {
  UK_SEED_CREATED_AT,
  UK_SOURCE_FILE_BASENAME,
  UK_SOURCE_UUID,
  UK_VERSION_UUID,
  efFactorChecksumV2,
  ukFactorUuid,
} from "./fixedIds.js";
import { normalizeUkRows } from "./normalize.js";
import {
  assertReconcileInvariants,
  parseUkWorkbook,
  reconcileUkRows,
} from "./parseWorkbook.js";
import { assertUkWorkbookSha256 } from "./sha256.js";
import {
  UK_DATASET_VERSION,
  UK_EXPECTED_SHA256,
  UK_REPORTING_YEAR,
  UK_SOURCE_KEY,
  UK_VERSION_LABEL,
  type UkCanonicalDto,
} from "./types.js";

function copyEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function copyField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "\\N";
  return copyEscape(String(value));
}

export type UkSeedArtifact = {
  sql: string;
  sha256: string;
  factorCount: number;
  sourceSha256: string;
  dtos: UkCanonicalDto[];
};

export function buildUkSeedSqlFromWorkbook(workbookPath: string): UkSeedArtifact {
  const sourceSha256 = assertUkWorkbookSha256(workbookPath);
  if (sourceSha256 !== UK_EXPECTED_SHA256) {
    throw new Error(`Unexpected XLSX SHA-256: ${sourceSha256}`);
  }

  const rows = parseUkWorkbook(workbookPath);
  const reconcile = reconcileUkRows(rows);
  assertReconcileInvariants(reconcile);

  const { dtos } = normalizeUkRows(rows);
  if (dtos.length !== 2622) {
    throw new Error(`Expected 2622 DTOs, got ${dtos.length}`);
  }

  // Explicit sort — never rely on Map/Set iteration order
  const sorted = [...dtos].sort((a, b) =>
    a.stableFactorId < b.stableFactorId ? -1 : a.stableFactorId > b.stableFactorId ? 1 : 0,
  );

  const factorLines: string[] = [];
  for (const dto of sorted) {
    const id = ukFactorUuid(dto.stableFactorId);
    const metadata = buildUkFactorMetadata(dto, sourceSha256, UK_SOURCE_FILE_BASENAME);
    const checksum = efFactorChecksumV2({
      stableFactorId: dto.stableFactorId,
      datasetVersion: UK_DATASET_VERSION,
      name: dto.name,
      valueText: dto.originalValue,
      unitNumerator: dto.unitNumerator,
      unitDenominator: dto.unitDenominator,
      countryCode: dto.countryCode,
      sourceCategory: dto.sourceCategory,
      factorType: dto.factorType,
    });

    const cols = [
      id,
      UK_VERSION_UUID,
      dto.externalCode,
      dto.name,
      dto.sourceCategory, // category
      dto.countryCode, // geography
      null, // technology
      dto.unitNumerator,
      dto.unitDenominator,
      dto.originalValue, // value as exact source text
      null, // uncertainty_pct
      null, // selection_rule
      stableStringify(metadata),
      UK_SEED_CREATED_AT,
      dto.stableFactorId,
      1, // version_number
      "draft", // status
      checksum,
      null, // approved_by
      null, // approved_at
      null, // valid_from
      null, // valid_until
      dto.factorType,
      dto.sourceCategory,
      dto.sourceSubcategory,
      dto.internalCategory,
      dto.internalSubcategory,
      dto.countryCode,
      null, // region
      null, // factor_year
      dto.lifecycleBoundary,
      dto.energyBasis,
      dto.gwpBasis,
      dto.factorKind,
    ];
    factorLines.push(cols.map((c) => copyField(c as string | number | null)).join("\t"));
  }

  const header = `-- =============================================================================
-- Seed: UK Government GHG Conversion Factors 2026 Flat File v1.2
-- DATA bootstrap — applied by migrate runners as 022 (not a hand-written INSERT dump).
--
-- Source XLSX SHA-256:
--   ${UK_EXPECTED_SHA256}
-- Generated from official flat file via apps/api UK adapter (ukGovGhg).
-- License: OGL-3.0
--
-- Fixed identities:
--   factor_sources.id              = ${UK_SOURCE_UUID}
--   emission_factor_versions.id    = ${UK_VERSION_UUID}
--   emission_factors.id            = UUID v5(namespace=${UK_VERSION_UUID}, name=stable_factor_id)
--
-- Governance (draft only):
--   status=draft catalog_status=hidden calculation_status=disabled resolver_status=disabled
--
-- Rows: 2622 activity_emission_factor (kg CO2e valued)
-- Idempotent: ON CONFLICT DO NOTHING on stable identities
-- Deterministic: sorted by stable_factor_id; fixed created_at; no random UUIDs
-- =============================================================================
BEGIN;

INSERT INTO factor_sources (
  id, name, license, homepage, source_key, publisher, metadata, created_at
) VALUES (
  '${UK_SOURCE_UUID}',
  'UK Government GHG Conversion Factors',
  'OGL-3.0',
  'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
  '${UK_SOURCE_KEY}',
  'UK DESNZ / Greenhouse Gas Statistics',
  '{"ogl":"3.0","collection":"government-conversion-factors-for-company-reporting","seed":"uk_gov_ghg_2026_flat_1_2"}'::jsonb,
  '${UK_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO emission_factor_versions (
  id, source_id, version_label, dataset_version, published_year, gwp_set, notes,
  status, catalog_status, calculation_status, resolver_status, created_at
) VALUES (
  '${UK_VERSION_UUID}',
  '${UK_SOURCE_UUID}',
  '${UK_VERSION_LABEL}',
  '${UK_DATASET_VERSION}',
  ${UK_REPORTING_YEAR},
  'mixed',
  'UK GHG Conversion Factors 2026 flat file v1.2 — draft bootstrap seed',
  'draft',
  'hidden',
  'disabled',
  'disabled',
  '${UK_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _seed_uk_gov_ghg_2026 (
  id UUID PRIMARY KEY,
  version_id UUID NOT NULL,
  external_code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  geography TEXT,
  technology TEXT,
  unit_numerator TEXT NOT NULL,
  unit_denominator TEXT NOT NULL,
  value NUMERIC NOT NULL,
  uncertainty_pct NUMERIC,
  selection_rule TEXT,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  stable_factor_id TEXT NOT NULL,
  version_number INT NOT NULL,
  status TEXT NOT NULL,
  checksum TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  valid_from DATE,
  valid_until DATE,
  factor_type TEXT NOT NULL,
  source_category TEXT,
  source_subcategory TEXT,
  internal_category TEXT,
  internal_subcategory TEXT,
  country_code TEXT,
  region TEXT,
  factor_year INT,
  lifecycle_boundary TEXT,
  energy_basis TEXT,
  gwp_basis TEXT,
  factor_kind TEXT
) ON COMMIT DROP;

COPY _seed_uk_gov_ghg_2026 (
  id, version_id, external_code, name, category, geography, technology,
  unit_numerator, unit_denominator, value, uncertainty_pct, selection_rule,
  metadata, created_at, stable_factor_id, version_number, status, checksum,
  approved_by, approved_at, valid_from, valid_until, factor_type,
  source_category, source_subcategory, internal_category, internal_subcategory,
  country_code, region, factor_year, lifecycle_boundary, energy_basis, gwp_basis, factor_kind
) FROM stdin;
`;

  const footer = `\\.

INSERT INTO emission_factors (
  id, version_id, external_code, name, category, geography, technology,
  unit_numerator, unit_denominator, value, uncertainty_pct, selection_rule,
  metadata, created_at, stable_factor_id, version_number, status, checksum,
  approved_by, approved_at, valid_from, valid_until, factor_type,
  source_category, source_subcategory, internal_category, internal_subcategory,
  country_code, region, factor_year, lifecycle_boundary, energy_basis, gwp_basis, factor_kind
)
SELECT
  id, version_id, external_code, name, category, geography, technology,
  unit_numerator, unit_denominator, value, uncertainty_pct, selection_rule,
  metadata, created_at, stable_factor_id, version_number, status, checksum,
  approved_by, approved_at, valid_from, valid_until, factor_type,
  source_category, source_subcategory, internal_category, internal_subcategory,
  country_code, region, factor_year, lifecycle_boundary, energy_basis, gwp_basis, factor_kind
FROM _seed_uk_gov_ghg_2026
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_cnt BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_cnt
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = '${UK_SOURCE_KEY}'
    AND v.dataset_version = '${UK_DATASET_VERSION}';
  IF v_cnt <> 2622 THEN
    RAISE EXCEPTION 'UK seed post-check failed: expected 2622 factors, got %', v_cnt;
  END IF;
END $$;

COMMIT;
`;

  const sql = `${header}${factorLines.join("\n")}\n${footer}`;
  const sha256 = createHash("sha256").update(sql, "utf8").digest("hex");
  return { sql, sha256, factorCount: sorted.length, sourceSha256, dtos: sorted };
}
