/**
 * Factor Resolver V1 — live matrix against real registry (10024).
 * Shadow mode only. Does not write ledger.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { resolveFactor } from "../services/factorResolver/index.js";
import type { ResolveFactorInput, ResolveFactorResult } from "../services/factorResolver/types.js";

const DATABASE_URL = process.env.DATABASE_URL;
const ORG = "00000000-0000-4000-8000-000000000001";

function base(partial: Partial<ResolveFactorInput> & Pick<ResolveFactorInput, "activity" | "unit">): ResolveFactorInput {
  return {
    mode: "shadow",
    organizationId: ORG,
    ...partial,
  };
}

function summarize(label: string, r: ResolveFactorResult) {
  return {
    label,
    status: r.status,
    retrieved: r.candidateSummary.retrieved,
    eligible: r.candidateSummary.eligible,
    source: r.selectedFactor?.source.key ?? null,
    stable: r.selectedFactor?.stableFactorId ?? null,
    name: r.selectedFactor?.name?.slice(0, 60) ?? null,
    reasons: r.reasons.slice(0, 6),
    warnings: r.warnings.slice(0, 4),
    latencyMs: r.latencyMs,
  };
}

describe("factor resolver live matrix", { skip: !DATABASE_URL }, () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });

  it("governance non-regression snapshot", async () => {
    const registry = await pool.query(`SELECT COUNT(*)::int AS n FROM emission_factors`);
    assert.equal(registry.rows[0].n, 10024);
    const gov = await pool.query(
      `SELECT s.source_key, v.calculation_status, v.resolver_status, COUNT(f.id)::int AS n
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       LEFT JOIN emission_factors f ON f.version_id = v.id
       WHERE s.source_key IN ('ademe','uk_gov_ghg','internal')
       GROUP BY 1,2,3 ORDER BY 1`,
    );
    const by = Object.fromEntries(gov.rows.map((r) => [r.source_key, r]));
    assert.equal(by.ademe.calculation_status, "enabled");
    assert.equal(by.ademe.resolver_status, "enabled");
    assert.equal(by.uk_gov_ghg.calculation_status, "enabled");
    assert.equal(by.uk_gov_ghg.resolver_status, "enabled");
    assert.equal(by.internal.calculation_status, "enabled");
    assert.equal(by.internal.resolver_status, "enabled");
  });

  it("matrix A–AF core cases", async () => {
    const report: ReturnType<typeof summarize>[] = [];

    const run = async (label: string, input: ResolveFactorInput) => {
      const r = await resolveFactor(pool, input);
      report.push(summarize(label, r));
      return r;
    };

    // A Tunisia electricity
    const a = await run("A_TN_electricity", base({ activity: "electricity", unit: "kWh", country: "TN" }));
    assert.ok(["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT"].includes(a.status));
    if (a.status === "RESOLVED") {
      assert.equal(a.selectedFactor?.source.key, "internal");
      assert.equal(a.selectedFactor?.stableFactorId, "electricity_kwh");
    }

    // B France electricity — ADEME NULL geo OK; may be AMBIGUOUS across years
    const b = await run("B_FR_electricity", base({ activity: "electricity", unit: "kWh", country: "FR" }));
    assert.ok(["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT"].includes(b.status));
    if (b.status === "RESOLVED") {
      assert.equal(b.selectedFactor?.source.key, "ademe");
      assert.ok(b.reasons.some((x) => x.includes("FR_IMPLIED") || x.includes("GEO")));
    }

    // C UK electricity without lifecycle → often REQUIRES_CONTEXT (direct vs wtt)
    const c = await run("C_GB_electricity", base({ activity: "electricity", unit: "kWh", country: "GB" }));
    assert.ok(["RESOLVED", "REQUIRES_CONTEXT", "AMBIGUOUS", "NO_MATCH"].includes(c.status));
    if (c.status === "REQUIRES_CONTEXT") {
      assert.ok(c.reasons.some((x) => x.includes("LIFECYCLE")));
    }

    const c2 = await run(
      "C2_GB_electricity_direct",
      base({ activity: "electricity", unit: "kWh", country: "GB", lifecycleBoundary: "direct" }),
    );
    if (c2.status === "RESOLVED") {
      assert.equal(c2.selectedFactor?.source.key, "uk_gov_ghg");
      assert.equal(c2.selectedFactor?.lifecycleBoundary, "direct");
    }

    // D France natural gas
    const d = await run("D_FR_gas", base({ activity: "natural gas", unit: "kWh", country: "FR" }));
    assert.ok(["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"].includes(d.status));
    if (d.status === "RESOLVED") assert.equal(d.selectedFactor?.source.key, "ademe");

    // E UK natural gas — energy basis ambiguity expected without energyBasis
    const e = await run("E_GB_gas", base({ activity: "natural gas", unit: "kWh", country: "GB", lifecycleBoundary: "direct" }));
    assert.ok(["REQUIRES_CONTEXT", "RESOLVED", "AMBIGUOUS"].includes(e.status));

    const eGross = await run(
      "M_GB_gas_gross",
      base({
        activity: "natural gas",
        unit: "kWh",
        country: "GB",
        lifecycleBoundary: "direct",
        energyBasis: "gross_cv",
      }),
    );
    if (eGross.status === "RESOLVED") {
      assert.equal(eGross.selectedFactor?.energyBasis, "gross_cv");
    }

    const eNet = await run(
      "N_GB_gas_net",
      base({
        activity: "natural gas",
        unit: "kWh",
        country: "GB",
        lifecycleBoundary: "direct",
        energyBasis: "net_cv",
      }),
    );
    if (eNet.status === "RESOLVED") {
      assert.equal(eNet.selectedFactor?.energyBasis, "net_cv");
    }

    // F diesel litre
    const f = await run("F_diesel_L_FR", base({ activity: "diesel", unit: "L", country: "FR", quantity: "100" }));
    assert.ok(["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"].includes(f.status));
    if (f.status === "RESOLVED") {
      assert.notEqual(f.selectedFactor?.factorType, "monetary");
    }

    // G diesel kg
    const g = await run("G_diesel_kg", base({ activity: "diesel", unit: "kg", country: "GB", lifecycleBoundary: "direct" }));
    assert.ok(["RESOLVED", "AMBIGUOUS", "REQUIRES_CONTEXT", "NO_MATCH"].includes(g.status));

    // H diesel monetary
    const h = await run(
      "H_diesel_monetary",
      base({ activity: "diesel", unit: "kEUR", country: "FR", factorTypeHint: "monetary" }),
    );
    assert.ok(["RESOLVED", "AMBIGUOUS", "NO_MATCH", "REQUIRES_CONTEXT"].includes(h.status));
    if (h.status === "RESOLVED") assert.equal(h.selectedFactor?.factorType, "monetary");

    // I flight passenger.km
    const i = await run(
      "I_flight_pkm",
      base({ activity: "flight", unit: "passenger.km", country: "FR" }),
    );
    assert.ok(["RESOLVED", "AMBIGUOUS", "NO_MATCH", "REQUIRES_CONTEXT"].includes(i.status));

    // J freight tonne.km
    const j = await run(
      "J_freight_tkm",
      base({ activity: "freight", unit: "tonne.km", country: "GB", lifecycleBoundary: "direct" }),
    );
    assert.ok(["RESOLVED", "AMBIGUOUS", "NO_MATCH", "REQUIRES_CONTEXT"].includes(j.status));

    // K WTT vs direct
    const k = await run(
      "K_diesel_wtt",
      base({ activity: "diesel", unit: "L", country: "GB", lifecycleBoundary: "wtt" }),
    );
    if (k.status === "RESOLVED") assert.equal(k.selectedFactor?.lifecycleBoundary, "wtt");

    // P review_required — preferSource UK process_fugitive often review_required
    const p = await run(
      "P_review",
      base({
        activity: "refrigerant",
        unit: "kg",
        country: "GB",
        preferredSource: "uk_gov_ghg",
        internalCategory: "process_fugitive",
      }),
    );
    assert.ok(["REVIEW_REQUIRED", "NO_MATCH", "AMBIGUOUS", "REQUIRES_CONTEXT", "RESOLVED"].includes(p.status));

    // T unknown geography
    const t = await run("T_no_country_electricity", base({ activity: "electricity", unit: "kWh" }));
    assert.ok(["REQUIRES_CONTEXT", "AMBIGUOUS", "RESOLVED", "NO_MATCH"].includes(t.status));

    // V ADEME null + TN must not pick ADEME as Tunisian
    const v = await run("V_TN_not_ademe_null", base({ activity: "electricity", unit: "kWh", country: "TN" }));
    if (v.status === "RESOLVED") {
      assert.notEqual(v.selectedFactor?.source.key, "ademe");
    }

    // W missing unit
    const w = await resolveFactor(pool, {
      activity: "diesel",
      unit: "",
      mode: "shadow",
      organizationId: ORG,
    });
    assert.equal(w.status, "REQUIRES_CONTEXT");

    // X no match
    const x = await run("X_nomatch", base({ activity: "zzzxxyyzz_no_factor", unit: "kWh", country: "FR" }));
    assert.equal(x.status, "NO_MATCH");

    // Z safe conversion kg→t retrieval path (diesel kg already); conversion object
    const z = await run(
      "Z_kg_to_check",
      base({ activity: "diesel", unit: "kg", country: "GB", lifecycleBoundary: "direct", quantity: "1000" }),
    );
    if (z.status === "RESOLVED" && z.unitConversion) {
      assert.ok(z.unitConversion.class === "exact" || z.unitConversion.class === "safe");
    }

    // AF determinism
    const af1 = await resolveFactor(pool, base({ activity: "electricity", unit: "kWh", country: "TN" }));
    const af2 = await resolveFactor(pool, base({ activity: "electricity", unit: "kWh", country: "TN" }));
    assert.equal(af1.status, af2.status);
    assert.equal(af1.selectedFactor?.id ?? null, af2.selectedFactor?.id ?? null);
    assert.deepEqual(af1.reasons, af2.reasons);

    // Candidate counts / latency sanity
    for (const row of report) {
      assert.ok(row.retrieved <= 50, `${row.label} retrieved ${row.retrieved}`);
      assert.ok(row.latencyMs < 5000, `${row.label} slow ${row.latencyMs}`);
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ matrix: report }, null, 2));
  });

  it("shadow does not write ledger", async () => {
    const before = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    await resolveFactor(pool, base({ activity: "electricity", unit: "kWh", country: "TN" }));
    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM calculation_ledger`);
    assert.equal(after.rows[0].n, before.rows[0].n);
  });

  // close pool after suite — node:test doesn't have after easily without care
  it("cleanup pool", async () => {
    await pool.end();
  });
});
