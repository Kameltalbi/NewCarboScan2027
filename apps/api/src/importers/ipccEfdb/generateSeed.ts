/**
 * Deterministic IPCC EFDB seed generator (staging + operational factors).
 */
import { createHash } from "node:crypto";
import { classifyAll, promoteOperationalFactors, summarizeClassification } from "./classify.js";
import {
  IPCC_EFDB_SEED_CREATED_AT,
  IPCC_EFDB_SOURCE_FILE_BASENAME,
  IPCC_EFDB_SOURCE_UUID,
  IPCC_EFDB_VERSION_UUID,
  efFactorChecksumV2,
  ipccEfdbFactorUuid,
} from "./fixedIds.js";
import { parseIpccEfdbWorkbook } from "./parseWorkbook.js";
import { assertIpccEfdbWorkbookSha256 } from "./sha256.js";
import {
  IPCC_EFDB_DATASET_VERSION,
  IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY,
  IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT,
  IPCC_EFDB_EXPECTED_RECORD_COUNT,
  IPCC_EFDB_EXPECTED_SHA256,
  IPCC_EFDB_SNAPSHOT_DATE,
  IPCC_EFDB_SOURCE_KEY,
  IPCC_EFDB_VERSION_LABEL,
  type IpccClassifiedRecord,
  type IpccFactorDto,
} from "./types.js";

function copyEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function copyField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "\\N";
  if (typeof value === "boolean") return value ? "t" : "f";
  return copyEscape(String(value));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function buildFactorMetadata(dto: IpccFactorDto, sourceSha256: string) {
  return {
    geography: {
      geographic_applicability: dto.geographicApplicability,
      note: "empty_region_is_not_world",
    },
    provenance: {
      sourceKey: IPCC_EFDB_SOURCE_KEY,
      datasetVersion: IPCC_EFDB_DATASET_VERSION,
      snapshotDate: IPCC_EFDB_SNAPSHOT_DATE,
      sourceFile: IPCC_EFDB_SOURCE_FILE_BASENAME,
      sourceSha256,
      efId: dto.efId,
      typeOfParameter: dto.typeOfParameter,
      gasCode: dto.gasCode,
      fuel: dto.fuel,
      geographicApplicability: dto.geographicApplicability,
      energyBasis: dto.energyBasis,
      semanticClass: dto.semanticClass,
      biogenicCo2: dto.biogenicCo2,
      co2Accounting: dto.biogenicCo2 ? "biogenic_outside_scopes_memo" : "fossil_scope",
      co2eRule:
        dto.factorKind === "activity_emission_factor"
          ? dto.biogenicCo2
            ? "biogenic_CO2_value_conserved_excluded_from_scope_totals"
            : "CO2_identity_kgCO2_per_TJ_equals_kgCO2e_per_TJ_GWP1_no_blend"
          : null,
      noteEmptyRegionIsNotWorld: true,
    },
  };
}

function stagingRow(c: IpccClassifiedRecord, sourceSha256: string): string {
  const payload = {
    ef_id: c.efId,
    ipcc_1996_category: c.ipcc1996Category,
    ipcc_2006_category: c.ipcc2006Category,
    gas: c.gasRaw,
    gases: c.gases,
    fuel_1996: c.fuel1996,
    fuel_2006: c.fuel2006,
    c_pool: c.cPool,
    type_of_parameter: c.typeOfParameter,
    description: c.description,
    technologies: c.technologies,
    parameters_conditions: c.parametersConditions,
    region: c.region,
    abatement: c.abatement,
    other_properties: c.otherProperties,
    value: c.valueRaw,
    unit: c.unitRaw,
    equation: c.equation,
    ipcc_worksheet: c.ipccWorksheet,
    technical_reference: c.technicalReference,
    source_of_data: c.sourceOfData,
    data_provider: c.dataProvider,
  };
  const cols = [
    c.efId,
    stableStringify(payload),
    c.valueRaw,
    stableStringify(c.valueParse),
    c.unitRaw,
    c.semanticClass,
    c.gasCode,
    c.geographicApplicability,
    c.exclusionReason,
    c.operationalPromote,
    c.typeOfParameter,
    c.ipcc2006Category,
    c.region,
    sourceSha256,
    IPCC_EFDB_SNAPSHOT_DATE,
    IPCC_EFDB_SEED_CREATED_AT,
  ];
  return cols.map((x) => copyField(x as string | number | boolean | null)).join("\t");
}

export type IpccSeedArtifact = {
  sql: string;
  sha256: string;
  recordCount: number;
  factorCount: number;
  autoGlobalActivity: number;
  sourceSha256: string;
  summary: ReturnType<typeof summarizeClassification>;
  stats: ReturnType<typeof parseIpccEfdbWorkbook>["stats"];
  dtos: IpccFactorDto[];
};

export function buildIpccEfdbSeedSqlFromWorkbook(workbookPath: string): IpccSeedArtifact {
  const sourceSha256 = assertIpccEfdbWorkbookSha256(workbookPath);
  if (sourceSha256 !== IPCC_EFDB_EXPECTED_SHA256) {
    throw new Error(`Unexpected XLSX SHA-256: ${sourceSha256}`);
  }

  const { records, stats } = parseIpccEfdbWorkbook(workbookPath);
  const classified = classifyAll(records);
  const summary = summarizeClassification(classified);
  const dtos = promoteOperationalFactors(classified);

  if (dtos.length !== IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT) {
    throw new Error(
      `Operational factor count ${dtos.length} ≠ ${IPCC_EFDB_EXPECTED_OPERATIONAL_FACTOR_COUNT}`,
    );
  }
  if (summary.autoGlobalActivity !== IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY) {
    throw new Error(
      `AUTO_GLOBAL_ACTIVITY ${summary.autoGlobalActivity} ≠ ${IPCC_EFDB_EXPECTED_AUTO_GLOBAL_ACTIVITY}`,
    );
  }

  const stagingLines = classified
    .slice()
    .sort((a, b) => a.efId.localeCompare(b.efId, undefined, { numeric: true }))
    .map((c) => stagingRow(c, sourceSha256));

  const factorLines: string[] = [];
  for (const dto of dtos) {
    const id = ipccEfdbFactorUuid(dto.stableFactorId);
    const metadata = buildFactorMetadata(dto, sourceSha256);
    const checksum = efFactorChecksumV2({
      stableFactorId: dto.stableFactorId,
      datasetVersion: IPCC_EFDB_DATASET_VERSION,
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
      IPCC_EFDB_VERSION_UUID,
      dto.externalCode,
      dto.name,
      dto.sourceCategory,
      null,
      null,
      dto.unitNumerator,
      dto.unitDenominator,
      dto.originalValue,
      null,
      null,
      stableStringify(metadata),
      IPCC_EFDB_SEED_CREATED_AT,
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
      null,
      dto.lifecycleBoundary,
      dto.energyBasis,
      dto.gwpBasis,
      dto.factorKind,
    ];
    factorLines.push(cols.map((c) => copyField(c as string | number | null)).join("\t"));
  }

  const header = `-- =============================================================================
-- Seed: IPCC EFDB (EFDB_output.xlsx)
-- DATA bootstrap — applied by migrate runners before 028.
--
-- Source XLSX SHA-256:
--   ${IPCC_EFDB_EXPECTED_SHA256}
-- Snapshot date (export): ${IPCC_EFDB_SNAPSHOT_DATE}
-- Records (staging): ${IPCC_EFDB_EXPECTED_RECORD_COUNT}
-- Operational factors (registry): ${dtos.length}
-- AUTO_GLOBAL_ACTIVITY (CO2 kgCO2e/TJ): ${summary.autoGlobalActivity}
--
-- Fixed identities:
--   factor_sources.id              = ${IPCC_EFDB_SOURCE_UUID}
--   emission_factor_versions.id    = ${IPCC_EFDB_VERSION_UUID}
--
-- Governance (draft only):
--   status=draft catalog_status=hidden calculation_status=disabled resolver_status=disabled
-- =============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS ipcc_efdb_records (
  ef_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  value_raw TEXT,
  value_parse JSONB NOT NULL,
  unit_raw TEXT,
  semantic_class TEXT NOT NULL,
  gas_code TEXT NOT NULL,
  geographic_applicability TEXT NOT NULL,
  exclusion_reason TEXT,
  operational_promote BOOLEAN NOT NULL DEFAULT false,
  type_of_parameter TEXT,
  ipcc_2006_category TEXT,
  region TEXT,
  source_sha256 TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipcc_efdb_semantic ON ipcc_efdb_records (semantic_class);
CREATE INDEX IF NOT EXISTS idx_ipcc_efdb_param ON ipcc_efdb_records (type_of_parameter);
CREATE INDEX IF NOT EXISTS idx_ipcc_efdb_promote ON ipcc_efdb_records (operational_promote);

INSERT INTO factor_sources (
  id, name, license, homepage, source_key, publisher, metadata, created_at
) VALUES (
  '${IPCC_EFDB_SOURCE_UUID}',
  'IPCC Emission Factor Database (EFDB)',
  'IPCC',
  'https://www.ipcc-nggip.iges.or.jp/EFDB/',
  '${IPCC_EFDB_SOURCE_KEY}',
  'IPCC',
  '{"seed":"ipcc_efdb","snapshotDate":"${IPCC_EFDB_SNAPSHOT_DATE}","note":"Empty region is not WORLD"}'::jsonb,
  '${IPCC_EFDB_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO emission_factor_versions (
  id, source_id, version_label, dataset_version, published_year, gwp_set, notes,
  status, catalog_status, calculation_status, resolver_status, created_at
) VALUES (
  '${IPCC_EFDB_VERSION_UUID}',
  '${IPCC_EFDB_SOURCE_UUID}',
  '${IPCC_EFDB_VERSION_LABEL}',
  '${IPCC_EFDB_DATASET_VERSION}',
  2006,
  NULL,
  'IPCC EFDB snapshot ${IPCC_EFDB_SNAPSHOT_DATE} — operational stationary combustion V1 draft; GWP unset at version (CO2 identity only for activity rows)',
  'draft',
  'hidden',
  'disabled',
  'disabled',
  '${IPCC_EFDB_SEED_CREATED_AT}'::timestamptz
)
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _seed_ipcc_efdb_records (
  ef_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  value_raw TEXT,
  value_parse JSONB NOT NULL,
  unit_raw TEXT,
  semantic_class TEXT NOT NULL,
  gas_code TEXT NOT NULL,
  geographic_applicability TEXT NOT NULL,
  exclusion_reason TEXT,
  operational_promote BOOLEAN NOT NULL,
  type_of_parameter TEXT,
  ipcc_2006_category TEXT,
  region TEXT,
  source_sha256 TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

COPY _seed_ipcc_efdb_records (
  ef_id, payload, value_raw, value_parse, unit_raw, semantic_class, gas_code,
  geographic_applicability, exclusion_reason, operational_promote, type_of_parameter,
  ipcc_2006_category, region, source_sha256, snapshot_date, created_at
) FROM stdin;
`;

  const mid = `\\.

INSERT INTO ipcc_efdb_records (
  ef_id, payload, value_raw, value_parse, unit_raw, semantic_class, gas_code,
  geographic_applicability, exclusion_reason, operational_promote, type_of_parameter,
  ipcc_2006_category, region, source_sha256, snapshot_date, created_at
)
SELECT * FROM _seed_ipcc_efdb_records
ON CONFLICT (ef_id) DO NOTHING;

CREATE TEMP TABLE _seed_ipcc_efdb_factors (
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

COPY _seed_ipcc_efdb_factors (
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
FROM _seed_ipcc_efdb_factors
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_rec BIGINT;
  v_fac BIGINT;
  v_act BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_rec FROM ipcc_efdb_records;
  IF v_rec <> ${IPCC_EFDB_EXPECTED_RECORD_COUNT} THEN
    RAISE EXCEPTION 'IPCC EFDB staging count % <> ${IPCC_EFDB_EXPECTED_RECORD_COUNT}', v_rec;
  END IF;
  SELECT COUNT(*) INTO v_fac
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = '${IPCC_EFDB_SOURCE_KEY}'
    AND v.dataset_version = '${IPCC_EFDB_DATASET_VERSION}';
  IF v_fac <> ${dtos.length} THEN
    RAISE EXCEPTION 'IPCC EFDB factor count % <> ${dtos.length}', v_fac;
  END IF;
  SELECT COUNT(*) INTO v_act
  FROM emission_factors f
  JOIN emission_factor_versions v ON v.id = f.version_id
  JOIN factor_sources s ON s.id = v.source_id
  WHERE s.source_key = '${IPCC_EFDB_SOURCE_KEY}'
    AND f.factor_kind = 'activity_emission_factor';
  IF v_act <> ${summary.autoGlobalActivity} THEN
    RAISE EXCEPTION 'IPCC EFDB activity CO2 count % <> ${summary.autoGlobalActivity}', v_act;
  END IF;
END $$;

COMMIT;
`;

  const sql = `${header}${stagingLines.join("\n")}\n${mid}${factorLines.join("\n")}\n${footer}`;
  const sha256 = createHash("sha256").update(sql, "utf8").digest("hex");
  return {
    sql,
    sha256,
    recordCount: records.length,
    factorCount: dtos.length,
    autoGlobalActivity: summary.autoGlobalActivity,
    sourceSha256,
    summary,
    stats,
    dtos,
  };
}
