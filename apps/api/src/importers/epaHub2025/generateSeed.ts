/**
 * Deterministic EPA Hub 2025 seed generator.
 */
import { createHash } from "node:crypto";
import { buildEpaFactorMetadata, stableStringify } from "./buildMetadata.js";
import {
  EPA_SEED_CREATED_AT,
  EPA_SOURCE_FILE_BASENAME,
  EPA_SOURCE_UUID,
  EPA_VERSION_UUID,
  efFactorChecksumV2,
  epaFactorUuid,
} from "./fixedIds.js";
import { normalizeEpaFactors, summarizeEpaDtos } from "./normalize.js";
import { parseEpaWorkbook } from "./parseTables.js";
import { assertEpaWorkbookSha256 } from "./sha256.js";
import {
  EPA_DATASET_VERSION,
  EPA_EXPECTED_SHA256,
  EPA_REPORTING_YEAR,
  EPA_SOURCE_KEY,
  EPA_VERSION_LABEL,
  type EpaCanonicalDto,
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

export type EpaSeedArtifact = {
  sql: string;
  sha256: string;
  factorCount: number;
  sourceSha256: string;
  dtos: EpaCanonicalDto[];
  summary: ReturnType<typeof summarizeEpaDtos>;
  naIgnored: number;
  zeros: number;
  negatives: number;
  sourceRows: number;
};

export function buildEpaSeedSqlFromWorkbook(workbookPath: string): EpaSeedArtifact {
  const sourceSha256 = assertEpaWorkbookSha256(workbookPath);
  if (sourceSha256 !== EPA_EXPECTED_SHA256) {
    throw new Error(`Unexpected XLSX SHA-256: ${sourceSha256}`);
  }

  const parsed = parseEpaWorkbook(workbookPath);
  const dtos = normalizeEpaFactors(parsed.factors);
  const summary = summarizeEpaDtos(dtos);

  const factorLines: string[] = [];
  for (const dto of dtos) {
    const id = epaFactorUuid(dto.stableFactorId);
    const metadata = buildEpaFactorMetadata(dto, sourceSha256, EPA_SOURCE_FILE_BASENAME);
    const checksum = efFactorChecksumV2({
      stableFactorId: dto.stableFactorId,
      datasetVersion: EPA_DATASET_VERSION,
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
      EPA_VERSION_UUID,
      dto.externalCode,
      dto.name,
      dto.sourceCategory,
      dto.countryCode,
      null,
      dto.unitNumerator,
      dto.unitDenominator,
      dto.originalValue,
      null,
      null,
      stableStringify(metadata),
      EPA_SEED_CREATED_AT,
      dto.stableFactorId,
      1,
      "draft",
      checksum,
      null,
      null,
      null,
      null,
      dto.factorType,
      dto.sourceCategory,
      dto.sourceSubcategory,
      dto.internalCategory,
      dto.internalSubcategory,
      dto.countryCode,
      dto.region,
      EPA_REPORTING_YEAR,
      dto.lifecycleBoundary,
      dto.energyBasis,
      dto.gwpBasis,
      dto.factorKind,
    ];
    factorLines.push(cols.map((c) => copyField(c as string | number | null)).join("\t"));
  }

  const header = `-- =============================================================================
-- Seed: US EPA GHG Emission Factors Hub 2025
-- DATA bootstrap — applied by migrate runners as 025.
--
-- Source XLSX SHA-256:
--   ${EPA_EXPECTED_SHA256}
-- Generated via apps/api epaHub2025 adapter.
--
-- Fixed identities:
--   factor_sources.id              = ${EPA_SOURCE_UUID}
--   emission_factor_versions.id    = ${EPA_VERSION_UUID}
--   emission_factors.id            = UUID v5(namespace=${EPA_VERSION_UUID}, name=stable_factor_id)
--
-- Governance (draft only):
--   status=draft catalog_status=hidden calculation_status=disabled resolver_status=disabled
--
-- Rows: ${dtos.length}
-- Idempotent: ON CONFLICT DO NOTHING on stable identities
-- Deterministic: sorted by stable_factor_id; fixed created_at; no random UUIDs
-- =============================================================================
BEGIN;

INSERT INTO factor_sources (
  id, name, license, homepage, source_key, publisher, metadata, created_at
) VALUES (
  '${EPA_SOURCE_UUID}',
  'US EPA GHG Emission Factors Hub',
  'US-Government-Work',
  'https://www.epa.gov/climateleadership/ghg-emission-factors-hub',
  '${EPA_SOURCE_KEY}',
  'United States Environmental Protection Agency',
  '{"seed":"epa_ghg_emission_factors_hub_2025","dataset":"GHG Emission Factors Hub 2025"}'::jsonb,
  '${EPA_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO emission_factor_versions (
  id, source_id, version_label, dataset_version, published_year, gwp_set, notes,
  status, catalog_status, calculation_status, resolver_status, created_at
) VALUES (
  '${EPA_VERSION_UUID}',
  '${EPA_SOURCE_UUID}',
  '${EPA_VERSION_LABEL}',
  '${EPA_DATASET_VERSION}',
  ${EPA_REPORTING_YEAR},
  'AR5',
  'EPA GHG Emission Factors Hub 2025 — draft bootstrap seed (resolver disabled)',
  'draft',
  'hidden',
  'disabled',
  'disabled',
  '${EPA_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _seed_epa_hub_2025 (
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

COPY _seed_epa_hub_2025 (
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
FROM _seed_epa_hub_2025
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_cnt BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_cnt
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = '${EPA_SOURCE_KEY}'
    AND v.dataset_version = '${EPA_DATASET_VERSION}';
  IF v_cnt <> ${dtos.length} THEN
    RAISE EXCEPTION 'EPA seed post-check failed: expected ${dtos.length} factors, got %', v_cnt;
  END IF;
END $$;

COMMIT;
`;

  const sql = `${header}${factorLines.join("\n")}\n${footer}`;
  const sha256 = createHash("sha256").update(sql, "utf8").digest("hex");
  return {
    sql,
    sha256,
    factorCount: dtos.length,
    sourceSha256,
    dtos,
    summary,
    naIgnored: parsed.naIgnored,
    zeros: parsed.zeros,
    negatives: parsed.negatives,
    sourceRows: parsed.sourceRows,
  };
}
