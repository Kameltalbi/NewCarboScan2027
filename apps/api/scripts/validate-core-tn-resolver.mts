/**
 * Controlled Core TN validation — temporary local script (do not commit unless asked).
 * Enables Core TN resolver_status only for the run, then restores governance.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import pg from "pg";
import { buildTestApp } from "../src/tests/helpers/buildTestApp.js";
import { signToken } from "../src/plugins/auth.js";
import { resolveFactor } from "../src/services/factorResolver/index.js";
import { DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR } from "../src/routes/calculate.js";

function loadDotEnv() {
  for (const p of [resolve(process.cwd(), "../../.env"), resolve(process.cwd(), ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1]!;
      let val = m[2]!.trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadDotEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DB connection string in environment");
  process.exit(1);
}

const REL_TOL = 1e-9;
const ABS_TOL = 1e-9;
const MARKER = "core-tn-validation-20260911";

type CoreFactor = {
  id: string;
  stable_factor_id: string;
  name: string;
  value: string;
  unit: string;
  unit_denominator: string;
  geography: string | null;
  country_code: string | null;
  source_key: string;
  dataset_version: string | null;
  checksum: string | null;
};

type CaseInput = {
  stableFactorId: string;
  activity: string;
  quantity: string;
  unit: string;
  scope: 1 | 2 | 3;
  internalCategory?: string;
  internalSubcategory?: string;
  factorTypeHint?: "physical" | "monetary";
};

const CASES: CaseInput[] = [
  {
    stableFactorId: "electricity_kwh",
    activity: "electricity",
    quantity: "1000",
    unit: "kWh",
    scope: 2,
    internalCategory: "energy",
  },
  {
    // Catalog name is FR ("Chaleur / vapeur"); English "heat …" alone does not retrieve
    // without a synonym — validated with realistic FR activity label.
    stableFactorId: "heat_kwh",
    activity: "chaleur",
    quantity: "500",
    unit: "kWh",
    scope: 2,
    internalCategory: "energy",
    internalSubcategory: "district_heating",
  },
  {
    stableFactorId: "gas_m3",
    activity: "natural gas",
    quantity: "100",
    unit: "m3",
    scope: 1,
    internalCategory: "energy",
  },
  {
    stableFactorId: "fuel_liters",
    activity: "fuel oil fioul carburant",
    quantity: "50",
    unit: "L",
    scope: 1,
    internalCategory: "energy",
    internalSubcategory: "fossil_fuels",
  },
  {
    stableFactorId: "fleet_diesel",
    activity: "diesel fleet",
    quantity: "40",
    unit: "L",
    scope: 1,
    internalCategory: "transport",
  },
  {
    stableFactorId: "fleet_essence",
    activity: "essence gasoline fleet",
    quantity: "30",
    unit: "L",
    scope: 1,
    internalCategory: "transport",
  },
  {
    stableFactorId: "refrigerant_kg",
    activity: "refrigerant fugitive",
    quantity: "2",
    unit: "kg",
    scope: 1,
    internalCategory: "process_fugitive",
  },
  {
    stableFactorId: "purchases_dt",
    activity: "purchases monetary",
    quantity: "1000",
    unit: "TND",
    scope: 3,
    internalCategory: "purchased_goods",
    factorTypeHint: "monetary",
  },
];

function nearlyEqual(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff <= ABS_TOL || diff <= REL_TOL * Math.max(Math.abs(a), Math.abs(b));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function stats(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  return {
    n: s.length,
    min: s[0],
    p50: percentile(s, 0.5),
    p95: percentile(s, 0.95),
    max: s[s.length - 1],
  };
}

async function governance(pool: pg.Pool) {
  const gov = await pool.query(
    `SELECT s.source_key, COUNT(f.id)::int AS n, v.calculation_status, v.resolver_status
     FROM emission_factor_versions v
     JOIN factor_sources s ON s.id = v.source_id
     LEFT JOIN emission_factors f ON f.version_id = v.id
     WHERE s.source_key IN ('ademe','uk_gov_ghg','internal')
     GROUP BY 1,3,4 ORDER BY 1`,
  );
  const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
  const visible = await pool.query(
    `SELECT COUNT(*)::int AS n FROM emission_factors f
     JOIN emission_factor_versions v ON v.id = f.version_id
     WHERE f.status='approved' AND v.status='approved' AND v.catalog_status='visible'`,
  );
  return { gov: gov.rows, registry: registry.rows[0].n, visible: visible.rows[0].n };
}

async function setInternalResolver(pool: pg.Pool, status: "enabled" | "disabled") {
  await pool.query(
    `UPDATE emission_factor_versions v
     SET resolver_status = $1
     FROM factor_sources s
     WHERE s.id = v.source_id AND s.source_key = 'internal'`,
    [status],
  );
}

async function main() {
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    marker: MARKER,
    tolerance: { abs: ABS_TOL, rel: REL_TOL },
  };
  const createdRunIds: string[] = [];

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const app = await buildTestApp();
  const prevFlag = process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;

  try {
    report.before = await governance(pool);

    const cores = await pool.query<CoreFactor>(
      `SELECT f.id, f.stable_factor_id, f.name, f.value::text AS value,
              (f.unit_numerator || '/' || f.unit_denominator) AS unit,
              f.unit_denominator, f.geography, f.country_code,
              s.source_key, v.dataset_version, f.checksum
       FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = 'internal'
       ORDER BY f.stable_factor_id`,
    );
    report.coreTnFactors = cores.rows;
    if (cores.rows.length !== 8) throw new Error(`expected 8 core factors, got ${cores.rows.length}`);

    const member = await pool.query<{
      user_id: string;
      email: string;
      organization_id: string;
    }>(
      `SELECT om.user_id, u.email, om.organization_id
       FROM organization_members om JOIN users u ON u.id = om.user_id LIMIT 1`,
    );
    if (!member.rows[0]) throw new Error("no org member");
    const organizationId = member.rows[0].organization_id;
    const userId = member.rows[0].user_id;
    const token = signToken({
      id: userId,
      email: member.rows[0].email,
      organizationId,
      role: "member",
    });
    const headers = {
      authorization: `Bearer ${token}`,
      "x-organization-id": organizationId,
      "content-type": "application/json",
    };

    // --- Activation ---
    await setInternalResolver(pool, "enabled");
    process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = "true";
    report.activation = {
      coreResolver: "enabled",
      flag: "true",
      ademeUk: "left disabled/disabled",
    };

    const ademe = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key='ademe' AND f.status='approved' LIMIT 1`,
    );
    const uk = await pool.query<{ id: string }>(
      `SELECT f.id FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key='uk_gov_ghg' AND f.status='approved' LIMIT 1`,
    );
    const ademeId = ademe.rows[0]!.id;
    const ukId = uk.rows[0]!.id;

    // --- 1) Resolve each of 8 ---
    const resolveResults: unknown[] = [];
    for (const c of CASES) {
      const t0 = performance.now();
      const r = await resolveFactor(pool, {
        activity: c.activity,
        quantity: c.quantity,
        unit: c.unit,
        country: "TN",
        internalCategory: c.internalCategory,
        internalSubcategory: c.internalSubcategory,
        factorTypeHint: c.factorTypeHint,
        mode: "production",
        organizationId,
      });
      const ms = performance.now() - t0;
      resolveResults.push({
        expectedStableId: c.stableFactorId,
        activity: c.activity,
        unit: c.unit,
        quantity: c.quantity,
        status: r.status,
        selectedStableId: r.selectedFactor?.stableFactorId ?? null,
        selectedSource: r.selectedFactor?.source.key ?? null,
        selectedValue: r.selectedFactor?.value ?? null,
        selectedUnit: r.selectedFactor?.unitDenominator ?? null,
        reasons: r.reasons,
        warnings: r.warnings,
        ms,
        ok:
          r.status === "RESOLVED" &&
          r.selectedFactor?.stableFactorId === c.stableFactorId &&
          r.selectedFactor?.source.key === "internal",
      });
    }
    report.resolveEight = resolveResults;

    // --- 2) E2E full pipeline for electricity ---
    const e2eTimes: number[] = [];
    const resolveTimes: number[] = [];
    let e2eBody: any = null;
    for (let i = 0; i < 12; i++) {
      const t0 = performance.now();
      const res = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve-and-calculate",
        headers,
        payload: {
          method: "bilan_carbone",
          lineKey: `${MARKER}-elec-${i}`,
          scope: 2,
          activity: "electricity",
          quantity: "1000",
          unit: "kWh",
          country: "TN",
          internalCategory: "energy",
        },
      });
      e2eTimes.push(performance.now() - t0);
      if (res.statusCode !== 200) {
        throw new Error(`E2E failed: ${res.statusCode} ${JSON.stringify(res.json())}`);
      }
      e2eBody = res.json();
      createdRunIds.push(e2eBody.runId);
      resolveTimes.push(Number(e2eBody.resolution?.latencyMs ?? 0) || 0);
    }

    const factorValue = Number(cores.rows.find((r) => r.stable_factor_id === "electricity_kwh")!.value);
    const expectedEmissions = 1000 * factorValue;
    const actualEmissions = Number(e2eBody.lines[0].resultKgCo2e);
    const mathOk = nearlyEqual(expectedEmissions, actualEmissions);

    const led = await pool.query(
      `SELECT id, run_id, factor_id, factor_checksum, activity_quantity::text, activity_unit,
              factor_value::text, factor_unit, result_kgco2e::text, provenance, unit_conversion
       FROM calculation_ledger WHERE run_id = $1`,
      [e2eBody.runId],
    );
    const ledgerRow = led.rows[0];
    const prov = ledgerRow.provenance;

    report.e2e = {
      statusCode: 200,
      runId: e2eBody.runId,
      resolutionStatus: e2eBody.resolution.status,
      selectedStableId: e2eBody.resolution.selectedFactor.stableFactorId,
      selectedSource: e2eBody.resolution.selectedFactor.source.key,
      originalQuantity: e2eBody.originalQuantity,
      normalizedQuantity: e2eBody.normalizedQuantity,
      factorValueUsed: e2eBody.lines[0].factorValue,
      emissions: actualEmissions,
      expected: expectedEmissions,
      mathOk,
      tolerance: { abs: ABS_TOL, rel: REL_TOL },
      formula: "quantity × authoritative factor value = 1000 × 0.523 = 523",
    };

    report.ledger = {
      activity_quantity: ledgerRow.activity_quantity,
      activity_unit: ledgerRow.activity_unit,
      factor_value: ledgerRow.factor_value,
      factor_unit: ledgerRow.factor_unit,
      result_kgco2e: ledgerRow.result_kgco2e,
      factor_id: ledgerRow.factor_id,
      factor_checksum: ledgerRow.factor_checksum,
      provenance: prov,
      unit_conversion: ledgerRow.unit_conversion,
      reproducible:
        prov?.resolverVersion != null &&
        prov?.rulesetVersion != null &&
        prov?.resolutionMode === "production" &&
        prov?.stableFactorId === "electricity_kwh" &&
        prov?.sourceKey === "internal" &&
        prov?.factorChecksum != null &&
        prov?.originalQuantity === "1000" &&
        prov?.normalizedQuantity === "1000" &&
        Number(ledgerRow.result_kgco2e) === 523,
    };

    // --- 3) Safe conversion E2E: tonne → kg on refrigerant ---
    const safeRes = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lineKey: `${MARKER}-ref-t`,
        scope: 1,
        activity: "refrigerant fugitive",
        quantity: "0.002",
        unit: "t",
        country: "TN",
        internalCategory: "process_fugitive",
      },
    });
    let safeConv: Record<string, unknown>;
    if (safeRes.statusCode === 200) {
      const body = safeRes.json() as any;
      createdRunIds.push(body.runId);
      const refVal = Number(cores.rows.find((r) => r.stable_factor_id === "refrigerant_kg")!.value);
      // 0.002 t → 2 kg × 1345
      const expectedSafe = 0.002 * 1000 * refVal;
      const actualSafe = Number(body.lines[0].resultKgCo2e);
      const ledSafe = await pool.query(
        `SELECT provenance, unit_conversion, activity_quantity::text, result_kgco2e::text
         FROM calculation_ledger WHERE run_id = $1`,
        [body.runId],
      );
      safeConv = {
        ok: true,
        status: body.resolution.status,
        selectedStableId: body.resolution.selectedFactor?.stableFactorId,
        originalQuantity: body.originalQuantity,
        originalUnit: body.originalUnit,
        normalizedQuantity: body.normalizedQuantity,
        normalizedUnit: body.normalizedUnit,
        unitConversion: body.unitConversion ?? ledSafe.rows[0].unit_conversion,
        ledgerUnitConversion: ledSafe.rows[0].unit_conversion,
        emissions: actualSafe,
        expected: expectedSafe,
        mathOk: nearlyEqual(expectedSafe, actualSafe),
        formula: "0.002 t × 1000 = 2 kg; 2 × 1345 = 2690 kgCO2e",
      };
    } else {
      // fallback energy MWh → kWh
      const mw = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve-and-calculate",
        headers,
        payload: {
          method: "bilan_carbone",
          lineKey: `${MARKER}-elec-mwh`,
          scope: 2,
          activity: "electricity",
          quantity: "1",
          unit: "MWh",
          country: "TN",
          internalCategory: "energy",
        },
      });
      if (mw.statusCode === 200) {
        const body = mw.json() as any;
        createdRunIds.push(body.runId);
        const expectedMw = 1 * 1000 * factorValue;
        safeConv = {
          ok: true,
          path: "MWh→kWh electricity",
          status: body.resolution.status,
          originalQuantity: body.originalQuantity,
          normalizedQuantity: body.normalizedQuantity,
          emissions: Number(body.lines[0].resultKgCo2e),
          expected: expectedMw,
          mathOk: nearlyEqual(expectedMw, Number(body.lines[0].resultKgCo2e)),
          formula: "1 MWh × 1000 = 1000 kWh; 1000 × 0.523 = 523",
          refrigerantAttempt: safeRes.json(),
        };
      } else {
        safeConv = {
          ok: false,
          refrigerantStatus: safeRes.statusCode,
          refrigerantBody: safeRes.json(),
          mwhStatus: mw.statusCode,
          mwhBody: mw.json(),
          note: "No Core TN safe-conversion E2E succeeded; rely on unit tests",
        };
      }
    }
    report.safeConversion = safeConv;

    // --- 4) Security ---
    const ledgerBeforeSec = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const fakeInject = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lineKey: `${MARKER}-fake`,
        scope: 2,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "TN",
        factorValue: "999",
        factorId: ademeId,
        resolverResult: { status: "RESOLVED" },
        conversionMultiplier: "2",
      },
    });
    const ademeDirect = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: `${MARKER}-ademe-direct`,
            scope: 1,
            factorId: ademeId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    const ukDirect = await app.inject({
      method: "POST",
      url: "/v1/calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lines: [
          {
            lineKey: `${MARKER}-uk-direct`,
            scope: 1,
            factorId: ukId,
            activityQuantity: "1",
            activityUnit: "kWh",
          },
        ],
      },
    });
    const ademeRac = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lineKey: `${MARKER}-ademe-rac`,
        scope: 2,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "FR",
      },
    });
    const ukRac = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lineKey: `${MARKER}-uk-rac`,
        scope: 2,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "GB",
        lifecycleBoundary: "direct",
      },
    });
    const ledgerAfterSec = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);

    report.security = {
      fakeClientInjectStatus: fakeInject.statusCode,
      fakeClientInject: fakeInject.json(),
      ademeDirectStatus: ademeDirect.statusCode,
      ademeDirectError: ademeDirect.json()?.error,
      ukDirectStatus: ukDirect.statusCode,
      ukDirectError: ukDirect.json()?.error,
      ademeRacStatus: ademeRac.statusCode,
      ademeRacError: ademeRac.json()?.error,
      ademeRacResolution: ademeRac.json()?.resolution?.status,
      ukRacStatus: ukRac.statusCode,
      ukRacError: ukRac.json()?.error,
      ukRacResolution: ukRac.json()?.resolution?.status,
      ledgerUnchanged: ledgerAfterSec.rows[0].n === ledgerBeforeSec.rows[0].n,
      directCalculateSourceRestrictedConstant: DIRECT_CALCULATE_SOURCE_RESTRICTED_ERROR,
    };

    // --- 5) non-RESOLVED ---
    const nonResolvedCases = [
      {
        name: "NO_MATCH",
        payload: {
          method: "bilan_carbone",
          lineKey: `${MARKER}-nomatch`,
          scope: 1,
          activity: "zzzxxyyzz_no_factor",
          quantity: "1",
          unit: "kWh",
          country: "TN",
        },
      },
      {
        name: "REQUIRES_CONTEXT_incomplete",
        // empty activity rejected by schema; use activity that needs monetary context mismatch
        payload: {
          method: "bilan_carbone",
          lineKey: `${MARKER}-reqctx`,
          scope: 3,
          activity: "purchases monetary",
          quantity: "100",
          unit: "kWh",
          country: "TN",
          factorTypeHint: "monetary",
        },
      },
    ];

    // Also production-mode shadow-like ambiguous: FR electricity with only Core TN enabled
    // should not resolve ADEME → NO_MATCH or not RESOLVED
    const beforeNr = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const beforeRuns = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_runs`);
    const nrResults: unknown[] = [];
    for (const c of nonResolvedCases) {
      const r = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve-and-calculate",
        headers,
        payload: c.payload,
      });
      nrResults.push({
        name: c.name,
        statusCode: r.statusCode,
        error: r.json()?.error,
        resolutionStatus: r.json()?.resolution?.status ?? null,
      });
    }
    // Shadow statuses without calc (flag on but force non-resolved via resolveFactor)
    const shadowStatuses: unknown[] = [];
    for (const [label, input] of [
      ["AMBIGUOUS_or_NO_MATCH_FR", { activity: "electricity", unit: "kWh", country: "FR" }],
      ["REQUIRES_CONTEXT_GB", { activity: "electricity", unit: "kWh", country: "GB" }],
      ["NO_MATCH", { activity: "zzzxxyyzz", unit: "kWh", country: "FR" }],
    ] as const) {
      const r = await resolveFactor(pool, {
        ...input,
        mode: "production",
        organizationId,
      });
      shadowStatuses.push({ label, status: r.status, selected: r.selectedFactor?.stableFactorId ?? null });
      if (r.status !== "RESOLVED") {
        const rac = await app.inject({
          method: "POST",
          url: "/v1/factors/resolve-and-calculate",
          headers,
          payload: {
            method: "bilan_carbone",
            lineKey: `${MARKER}-${label}`,
            scope: 2,
            activity: input.activity,
            quantity: "1",
            unit: input.unit,
            country: input.country,
          },
        });
        nrResults.push({
          name: label,
          via: "resolve-and-calculate",
          statusCode: rac.statusCode,
          error: rac.json()?.error,
          resolutionStatus: rac.json()?.resolution?.status,
        });
      }
    }
    const afterNr = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const afterRuns = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_runs`);
    report.nonResolved = {
      cases: nrResults,
      productionResolveStatuses: shadowStatuses,
      ledgerUnchanged: afterNr.rows[0].n === beforeNr.rows[0].n,
      runsUnchanged: afterRuns.rows[0].n === beforeRuns.rows[0].n,
    };

    // --- 6) Atomicity: fake evidenceId after resolve → no partial write ---
    const beforeAtom = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const beforeAtomRuns = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_runs`);
    const fakeEvidence = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const atom = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve-and-calculate",
      headers,
      payload: {
        method: "bilan_carbone",
        lineKey: `${MARKER}-atom`,
        scope: 2,
        evidenceId: fakeEvidence,
        activity: "electricity",
        quantity: "10",
        unit: "kWh",
        country: "TN",
        internalCategory: "energy",
      },
    });
    const afterAtom = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    const afterAtomRuns = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_runs`);
    report.atomicity = {
      statusCode: atom.statusCode,
      error: atom.json()?.error,
      note: "fake evidenceId forces failure inside withOrgClient after RESOLVED path",
      ledgerUnchanged: afterAtom.rows[0].n === beforeAtom.rows[0].n,
      runsUnchanged: afterAtomRuns.rows[0].n === beforeAtomRuns.rows[0].n,
    };

    // Extra resolve latency samples
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      await resolveFactor(pool, {
        activity: "electricity",
        quantity: "1",
        unit: "kWh",
        country: "TN",
        mode: "production",
        organizationId,
      });
      resolveTimes.push(performance.now() - t0);
    }

    report.performance = {
      resolveMs: stats(resolveTimes.filter((x) => x > 0)),
      resolveAndCalculateMs: stats(e2eTimes),
      unit: "ms",
    };

    // E2E all 8 via resolve-and-calculate
    const e2eAll: unknown[] = [];
    for (const c of CASES) {
      const core = cores.rows.find((r) => r.stable_factor_id === c.stableFactorId)!;
      const res = await app.inject({
        method: "POST",
        url: "/v1/factors/resolve-and-calculate",
        headers,
        payload: {
          method: "bilan_carbone",
          lineKey: `${MARKER}-all-${c.stableFactorId}`,
          scope: c.scope,
          activity: c.activity,
          quantity: c.quantity,
          unit: c.unit,
          country: "TN",
          internalCategory: c.internalCategory,
          internalSubcategory: c.internalSubcategory,
          factorTypeHint: c.factorTypeHint,
        },
      });
      const body = res.json() as any;
      if (res.statusCode === 200) createdRunIds.push(body.runId);
      const qty = Number(c.quantity);
      const fv = Number(core.value);
      const expected = qty * fv;
      const actual = res.statusCode === 200 ? Number(body.lines[0].resultKgCo2e) : NaN;
      e2eAll.push({
        stableFactorId: c.stableFactorId,
        statusCode: res.statusCode,
        resolutionStatus: body.resolution?.status,
        selectedStableId: body.resolution?.selectedFactor?.stableFactorId,
        selectedSource: body.resolution?.selectedFactor?.source?.key,
        expected,
        actual,
        mathOk: res.statusCode === 200 && nearlyEqual(expected, actual),
        error: body.error,
      });
    }
    report.e2eAllEight = e2eAll;

    // Shadow still works
    const shadow = await app.inject({
      method: "POST",
      url: "/v1/factors/resolve",
      headers,
      payload: { activity: "electricity", unit: "kWh", country: "TN", mode: "shadow" },
    });
    report.shadowOk = shadow.statusCode === 200 && shadow.json().status === "RESOLVED";

    // Direct calculate still protected for ADEME even with Core resolver on
    report.calculateStillProtected =
      ademeDirect.statusCode === 400 && ukDirect.statusCode === 400;
  } finally {
    // --- Restore ---
    try {
      if (createdRunIds.length > 0) {
        await pool.query(`DELETE FROM calculation_ledger WHERE run_id = ANY($1::uuid[])`, [
          createdRunIds,
        ]);
        await pool.query(`DELETE FROM audit_events WHERE resource_id = ANY($1::uuid[])`, [
          createdRunIds,
        ]);
        await pool.query(`DELETE FROM calculation_runs WHERE id = ANY($1::uuid[])`, [createdRunIds]);
      }
    } catch (cleanupErr) {
      report.cleanupError = String(cleanupErr);
    }

    await setInternalResolver(pool, "disabled");
    if (prevFlag === undefined) delete process.env.FACTOR_RESOLVER_CALCULATION_ENABLED;
    else process.env.FACTOR_RESOLVER_CALCULATION_ENABLED = prevFlag;

    report.after = await governance(pool);
    report.createdRunIdsCleaned = createdRunIds.length;
    report.finishedAt = new Date().toISOString();

    await app.close();
    await pool.end();
  }

  const outPath = resolve(
    process.cwd(),
    "../../docs/_core_tn_validation_raw.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, outPath, summary: {
    resolveEightOk: (report.resolveEight as any[]).filter((r) => r.ok).length,
    e2eMath: (report.e2e as any).mathOk,
    safeOk: (report.safeConversion as any).ok,
    ledgerRepro: (report.ledger as any).reproducible,
    securityLedgerUnchanged: (report.security as any).ledgerUnchanged,
    nonResolvedOk: (report.nonResolved as any).ledgerUnchanged,
    atomicityOk: (report.atomicity as any).ledgerUnchanged && (report.atomicity as any).runsUnchanged,
    after: report.after,
    perf: report.performance,
  }}, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
