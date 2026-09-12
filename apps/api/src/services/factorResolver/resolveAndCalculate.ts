import type { Pool, PoolClient } from "pg";
import {
  calculateCarbonBalance,
  buildFactualReportCommentary,
  ENGINE_VERSION,
  type CalculationInputLine,
} from "@newcarboscan/carbon-engine";
import { withOrgClient } from "../../db.js";
import { resolveFactor } from "./resolveFactor.js";
import {
  isResolverCalculationEnabled,
  RESOLVER_CALCULATION_DISABLED_ERROR,
} from "./featureFlags.js";
import { PRODUCTION_SAFE_FACTOR_SQL } from "./productionSafeSubset.js";
import type { ResolveFactorInput, ResolveFactorResult, UnitConversionResult } from "./types.js";
import { applyQuantityConversion, normalizeResolverUnit } from "./unitCompatibility.js";

type Queryable = Pick<Pool, "query">;

export const RESOLVE_CALCULATE_NOT_RESOLVED = "FACTOR_NOT_RESOLVED";
export const RESOLVE_CALCULATE_FACTOR_UNAVAILABLE =
  "Resolved factor failed authoritative governance reload";

export type ResolveAndCalculateInput = {
  organizationId: string;
  userId: string;
  ip?: string;
  method: "ghg_protocol" | "bilan_carbone" | "cbam" | "pcf";
  periodStart?: string;
  periodEnd?: string;
  lineKey: string;
  scope: 1 | 2 | 3;
  evidenceId?: string;
  resolve: Omit<ResolveFactorInput, "mode" | "organizationId">;
};

export type ResolveAndCalculateResult =
  | {
      ok: false;
      httpStatus: 403 | 422 | 404;
      error: string;
      resolution: ResolveFactorResult | null;
    }
  | {
      ok: true;
      httpStatus: 200;
      runId: string;
      engineVersion: string;
      methodologyVersion: string;
      totals: ReturnType<typeof calculateCarbonBalance>["totals"];
      inputHash: string;
      resultHash: string;
      commentary: ReturnType<typeof buildFactualReportCommentary>;
      lines: ReturnType<typeof calculateCarbonBalance>["lines"];
      resolution: ResolveFactorResult;
      normalizedQuantity: string;
      normalizedUnit: string;
      originalQuantity: string;
      originalUnit: string;
      unitConversion: UnitConversionResult | null;
    };

/**
 * Production path: Resolver (server) → authoritative DB factor → engine → ledger.
 * Client cannot inject factorValue, conversion, or resolverResult.
 */
export async function resolveAndCalculate(
  pool: Queryable,
  input: ResolveAndCalculateInput,
): Promise<ResolveAndCalculateResult> {
  if (!isResolverCalculationEnabled()) {
    return {
      ok: false,
      httpStatus: 403,
      error: RESOLVER_CALCULATION_DISABLED_ERROR,
      resolution: null,
    };
  }

  const originalQuantity = input.resolve.quantity?.trim() || input.resolve.quantity || "1";
  const originalUnit = normalizeResolverUnit(input.resolve.unit);

  const resolution = await resolveFactor(pool, {
    ...input.resolve,
    quantity: String(originalQuantity),
    unit: originalUnit,
    mode: "production",
    organizationId: input.organizationId,
  });

  if (resolution.status !== "RESOLVED" || !resolution.selectedFactor) {
    const httpStatus = resolution.status === "NO_MATCH" ? 404 : 422;
    return {
      ok: false,
      httpStatus,
      error: RESOLVE_CALCULATE_NOT_RESOLVED,
      resolution,
    };
  }

  const selectedId = resolution.selectedFactor.id;

  // Authoritative reload — never trust client or resolver snapshot values for math
  const loaded = await pool.query<{
    id: string;
    value: string;
    unit_numerator: string;
    unit_denominator: string;
    unit: string;
    uncertainty_pct: string | null;
    checksum: string | null;
    version_id: string;
    stable_factor_id: string | null;
    external_code: string | null;
    dataset_version: string | null;
    source_key: string;
    calculation_status: string;
    resolver_status: string;
  }>(
    `SELECT f.id, f.value::text AS value,
            f.unit_numerator, f.unit_denominator,
            (f.unit_numerator || '/' || f.unit_denominator) AS unit,
            f.uncertainty_pct::text AS uncertainty_pct,
            f.checksum, f.version_id,
            f.stable_factor_id, f.external_code,
            v.dataset_version, s.source_key,
            v.calculation_status, v.resolver_status
     FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     JOIN factor_sources s ON s.id = v.source_id
     WHERE f.id = $1
       AND f.status = 'approved'
       AND v.status = 'approved'
       AND v.calculation_status = 'enabled'
       AND v.resolver_status = 'enabled'
       AND ${PRODUCTION_SAFE_FACTOR_SQL}`,
    [selectedId],
  );

  if (!loaded.rows[0]) {
    return {
      ok: false,
      httpStatus: 422,
      error: RESOLVE_CALCULATE_FACTOR_UNAVAILABLE,
      resolution,
    };
  }

  const f = loaded.rows[0];
  const conversion = resolution.unitConversion;
  let normalizedQuantity = String(originalQuantity);
  let normalizedUnit = originalUnit;

  if (conversion) {
    if (conversion.class !== "exact" && conversion.class !== "safe") {
      return {
        ok: false,
        httpStatus: 422,
        error: "UNIT_CONVERSION_NOT_SAFE",
        resolution,
      };
    }
    const converted = applyQuantityConversion(String(originalQuantity), conversion.multiplier);
    if (converted === null) {
      return {
        ok: false,
        httpStatus: 422,
        error: "UNIT_CONVERSION_FAILED",
        resolution,
      };
    }
    normalizedQuantity = converted;
    normalizedUnit = conversion.toUnit;
    // Denominator must match factor
    if (normalizeResolverUnit(f.unit_denominator) !== normalizeResolverUnit(conversion.toUnit)) {
      return {
        ok: false,
        httpStatus: 422,
        error: "UNIT_CONVERSION_FACTOR_MISMATCH",
        resolution,
      };
    }
  } else if (normalizeResolverUnit(f.unit_denominator) !== originalUnit) {
    return {
      ok: false,
      httpStatus: 422,
      error: "UNIT_INCOMPATIBLE_AFTER_RESOLVE",
      resolution,
    };
  }

  const engineLine: CalculationInputLine = {
    lineKey: input.lineKey,
    scope: input.scope,
    evidenceId: input.evidenceId,
    factorId: f.id,
    activityQuantity: normalizedQuantity,
    activityUnit: normalizedUnit,
    factorValue: f.value,
    factorUnit: f.unit,
  };

  const result = calculateCarbonBalance([engineLine], "ghg-corporate-1.0.0");

  const provenance = {
    source: "api/v1/factors/resolve-and-calculate",
    factorResolvedFromDb: true,
    clientOverride: false,
    resolutionMode: "production",
    resolverVersion: resolution.resolverVersion,
    rulesetVersion: resolution.rulesetVersion,
    stableFactorId: f.stable_factor_id,
    externalCode: f.external_code,
    sourceKey: f.source_key,
    datasetVersion: f.dataset_version,
    factorChecksum: f.checksum,
    originalQuantity: String(originalQuantity),
    originalUnit,
    normalizedQuantity,
    normalizedUnit,
    resolutionStatus: "RESOLVED",
    reasons: resolution.reasons,
    warnings: resolution.warnings,
    // Carry EPA Safe Subset V1 fields from resolution provenance when present
    ...(resolution.provenance?.epaSafeSubsetRuleset
      ? {
          epaSafeSubsetRuleset: resolution.provenance.epaSafeSubsetRuleset,
          epaSafeClass: resolution.provenance.epaSafeClass,
          geographicApplicability: resolution.provenance.geographicApplicability,
          originalGeography: resolution.provenance.originalGeography,
          lifecycleBoundary: resolution.provenance.lifecycleBoundary,
          gwpBasis: resolution.provenance.gwpBasis,
          derived: resolution.provenance.derived,
          epaTableNumber: resolution.provenance.epaTableNumber,
          egrid: resolution.provenance.egrid,
        }
      : {}),
    ...(resolution.provenance?.ipccSafeSubsetRuleset
      ? {
          ipccSafeSubsetRuleset: resolution.provenance.ipccSafeSubsetRuleset,
          ipccSafeClass: resolution.provenance.ipccSafeClass,
          geographicApplicability: resolution.provenance.geographicApplicability,
          energyBasis: resolution.provenance.energyBasis,
          lifecycleBoundary: resolution.provenance.lifecycleBoundary,
          noteEmptyRegionIsNotWorld: resolution.provenance.noteEmptyRegionIsNotWorld,
        }
      : {}),
  };

  const unitConversionJson = conversion
    ? {
        class: conversion.class,
        type: conversion.class === "exact" ? "exact" : "safe",
        fromUnit: conversion.fromUnit,
        toUnit: conversion.toUnit,
        multiplier: conversion.multiplier,
      }
    : {
        class: "exact",
        type: "exact",
        fromUnit: originalUnit,
        toUnit: normalizedUnit,
        multiplier: 1,
      };

  // Atomic write: run + ledger + audit in one transaction
  const runId = await withOrgClient(input.organizationId, async (client: PoolClient) => {
    if (input.evidenceId) {
      const ev = await client.query(
        `SELECT id FROM evidence_records WHERE id = $1 AND organization_id = $2`,
        [input.evidenceId, input.organizationId],
      );
      if (!ev.rows[0]) {
        throw new Error(`Evidence not found: ${input.evidenceId}`);
      }
    }

    const run = await client.query(
      `INSERT INTO calculation_runs
        (organization_id, engine_version, methodology_version, method,
         period_start, period_end, input_hash, result_hash, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        input.organizationId,
        ENGINE_VERSION,
        result.methodologyVersion,
        input.method,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        result.inputHash,
        result.resultHash,
        input.userId,
      ],
    );
    const id = run.rows[0].id as string;
    const line = result.lines[0]!;

    await client.query(
      `INSERT INTO calculation_ledger
        (run_id, organization_id, line_key, scope, evidence_id, factor_id,
         factor_version_id, factor_checksum, formula,
         activity_quantity, activity_unit, factor_value, factor_unit, allocation_factor,
         result_kgco2e, uncertainty_pct, engine_version, methodology_version,
         provenance, unit_conversion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id,
        input.organizationId,
        line.lineKey,
        line.scope,
        line.evidenceId ?? null,
        f.id,
        f.version_id,
        f.checksum,
        line.formula,
        normalizedQuantity,
        normalizedUnit,
        f.value,
        f.unit,
        line.allocationFactor,
        line.resultKgCo2e,
        line.uncertaintyPct ?? null,
        line.engineVersion,
        line.methodologyVersion,
        JSON.stringify(provenance),
        JSON.stringify(unitConversionJson),
      ],
    );

    await client.query(
      `INSERT INTO audit_events (organization_id, user_id, action, resource_type, resource_id, ip, payload)
       VALUES ($1,$2,'resolve_and_calculate','calculation_run',$3,$4,$5)`,
      [
        input.organizationId,
        input.userId,
        id,
        input.ip ?? null,
        JSON.stringify({
          method: input.method,
          factorId: f.id,
          stableFactorId: f.stable_factor_id,
          sourceKey: f.source_key,
          resolverVersion: resolution.resolverVersion,
          rulesetVersion: resolution.rulesetVersion,
        }),
      ],
    );

    return id;
  });

  return {
    ok: true,
    httpStatus: 200,
    runId,
    engineVersion: ENGINE_VERSION,
    methodologyVersion: result.methodologyVersion,
    totals: result.totals,
    inputHash: result.inputHash,
    resultHash: result.resultHash,
    commentary: buildFactualReportCommentary(result),
    lines: result.lines,
    resolution,
    normalizedQuantity,
    normalizedUnit,
    originalQuantity: String(originalQuantity),
    originalUnit,
    unitConversion: conversion,
  };
}
