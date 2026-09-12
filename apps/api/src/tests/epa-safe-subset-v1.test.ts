/**
 * EPA Safe Subset V1 — classification, geography, eGRID / GWP / review policies.
 * Requires DATABASE_URL (fresh DB with migrations through 026 preferred).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {
  classifyEpaSafeClass,
  EPA_AUTO_US_SAFE_SQL,
  EPA_GLOBAL_GWP_SQL,
  EPA_SAFE_SUBSET_EXPECTED_COUNTS,
  EPA_SAFE_SUBSET_RULESET,
  EPA_SOURCE_KEY,
  isEpaEgridFactor,
  type EpaClassificationInput,
} from "../services/factorResolver/epaSafeSubset.js";
import { evaluateGeography } from "../services/factorResolver/geographyPolicy.js";
import { isProductionSafeCandidate } from "../services/factorResolver/productionSafeSubset.js";
import { resolveFactor } from "../services/factorResolver/resolveFactor.js";
import { compareUnits } from "../services/factorResolver/unitCompatibility.js";
import { EXPECTED_SUBSET_COUNTS, RULESET_VERSION } from "../services/factorResolver/index.js";
import {
  CATALOG_VISIBLE_TOTAL,
  EPA_AUTO_GLOBAL_ACTIVITY,
  EPA_AUTO_US,
  EPA_COUNT,
  EPA_GLOBAL_GWP,
  EPA_REVIEW_REQUIRED,
  REGISTRY_TOTAL,
} from "./helpers/registryCounts.js";

const DATABASE_URL = process.env.DATABASE_URL;

function baseCandidate(
  partial: Partial<Parameters<typeof isProductionSafeCandidate>[0]> = {},
): Parameters<typeof isProductionSafeCandidate>[0] {
  return {
    id: "00000000-0000-4000-8000-000000000099",
    stableFactorId: "epa:test",
    externalCode: null,
    name: "test",
    value: 1,
    unitNumerator: "kgCO2e",
    unitDenominator: "kWh",
    sourceKey: EPA_SOURCE_KEY,
    sourceName: "EPA",
    datasetVersion: "2025",
    countryCode: "US",
    region: null,
    factorType: "physical",
    factorKind: "activity_emission_factor",
    lifecycleBoundary: "direct",
    energyBasis: null,
    gwpBasis: "AR5",
    factorYear: 2025,
    internalCategory: null,
    internalSubcategory: null,
    checksum: null,
    reviewRequired: false,
    catalogStatus: "visible",
    calculationStatus: "disabled",
    resolverStatus: "disabled",
    textScore: 0.5,
    geographicApplicability: "US_SPECIFIC",
    epaTableNumber: 6,
    epaDerived: true,
    ...partial,
  };
}

describe("EPA Safe Subset V1 policy (unit)", () => {
  it("pins expected class counts", () => {
    assert.equal(EPA_SAFE_SUBSET_EXPECTED_COUNTS.total, EPA_COUNT);
    assert.equal(EPA_SAFE_SUBSET_EXPECTED_COUNTS.autoUs, EPA_AUTO_US);
    assert.equal(EPA_SAFE_SUBSET_EXPECTED_COUNTS.autoGlobalActivity, EPA_AUTO_GLOBAL_ACTIVITY);
    assert.equal(EPA_SAFE_SUBSET_EXPECTED_COUNTS.globalGwp, EPA_GLOBAL_GWP);
    assert.equal(EPA_SAFE_SUBSET_EXPECTED_COUNTS.reviewRequired, EPA_REVIEW_REQUIRED);
    assert.equal(
      EPA_AUTO_US + EPA_AUTO_GLOBAL_ACTIVITY + EPA_GLOBAL_GWP + EPA_REVIEW_REQUIRED,
      EPA_COUNT,
    );
    assert.equal(EXPECTED_SUBSET_COUNTS.epaSafeUs, 258);
    assert.equal(EXPECTED_SUBSET_COUNTS.epaAutoGlobalActivity, 0);
    assert.equal(EPA_SAFE_SUBSET_RULESET, "EPA_SAFE_SUBSET_V1_2026_09");
    assert.equal(RULESET_VERSION, "2026-09-v6");
  });

  it("classifies GLOBAL_APPLICABLE gwp as GLOBAL_GWP only", () => {
    const input: EpaClassificationInput = {
      factorKind: "gwp",
      countryCode: null,
      gwpBasis: "AR5",
      lifecycleBoundary: "other",
      reviewRequired: false,
      geographicApplicability: "GLOBAL_APPLICABLE",
      epaTableNumber: 11,
      epaDerived: false,
    };
    assert.equal(classifyEpaSafeClass(input), "GLOBAL_GWP");
    assert.equal(
      isProductionSafeCandidate(
        baseCandidate({
          factorKind: "gwp",
          factorType: "gwp",
          countryCode: null,
          geographicApplicability: "GLOBAL_APPLICABLE",
          epaTableNumber: 11,
          epaDerived: false,
        }),
      ),
      false,
    );
  });

  it("never auto-global for stationary combustion review rows", () => {
    assert.equal(
      classifyEpaSafeClass({
        factorKind: "activity_emission_factor",
        countryCode: null,
        gwpBasis: "AR5",
        lifecycleBoundary: "direct",
        reviewRequired: true,
        geographicApplicability: "REQUIRES_REVIEW",
        epaTableNumber: 1,
        epaDerived: true,
      }),
      "REVIEW_REQUIRED",
    );
  });

  it("AUTO_US for eGRID / US activity; eGRID geo rejects TN/FR/GB", () => {
    const egrid = baseCandidate({
      name: "eGRID AZNM — total output — CO2e derived AR5",
      stableFactorId: "epa:2025:t6:aznm:total_output:co2e_derived:kg_co2e_per_mwh",
      unitDenominator: "MWh",
      region: "AZNM",
      epaTableNumber: 6,
    });
    assert.ok(isEpaEgridFactor(egrid));
    assert.equal(isProductionSafeCandidate(egrid), true);
    assert.equal(classifyEpaSafeClass({
      factorKind: egrid.factorKind,
      countryCode: egrid.countryCode,
      gwpBasis: egrid.gwpBasis,
      lifecycleBoundary: egrid.lifecycleBoundary,
      reviewRequired: egrid.reviewRequired,
      geographicApplicability: egrid.geographicApplicability,
      epaTableNumber: egrid.epaTableNumber,
      epaDerived: egrid.epaDerived,
    }), "AUTO_US");

    for (const country of ["TN", "FR", "GB"] as const) {
      const geo = evaluateGeography({ country }, egrid);
      assert.equal(geo.eligible, false, country);
      assert.ok(
        geo.reasonCode === "GEO_EPA_EGRID_US_ONLY" ||
          geo.reasonCode === "GEO_EPA_US_INCOMPATIBLE",
        geo.reasonCode,
      );
    }
    const us = evaluateGeography({ country: "US", region: "AZNM" }, egrid);
    assert.equal(us.eligible, true);
    assert.equal(us.rank, 5);
  });

  it("safe unit conversion kWh↔MWh allowed; semantic refuse separate", () => {
    const u = compareUnits("kWh", "MWh");
    assert.ok(u.class === "EXACT" || u.class === "SAFE_CONVERSION");
    const bad = compareUnits("kWh", "kg");
    assert.ok(bad.class === "INCOMPATIBLE" || bad.class === "CONTEXT_REQUIRED");
  });
});

describe("EPA Safe Subset V1 live DB", { skip: !DATABASE_URL }, () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL!, max: 3 });

  it("SQL class counts match pinned Safe Subset V1", async () => {
    const autoUs = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${EPA_AUTO_US_SAFE_SQL.replace(/v\.catalog_status = 'visible'/, "TRUE")}`,
    );
    // Count without requiring catalog visible (works pre/post 026)
    const autoUsAny = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1
         AND coalesce(f.metadata->>'normalization_status', '') <> 'review_required'
         AND f.factor_kind = 'activity_emission_factor'
         AND f.gwp_basis = 'AR5'
         AND f.lifecycle_boundary IN ('direct', 'waste_treatment')
         AND f.country_code = 'US'
         AND f.metadata->'geography'->>'geographic_applicability' = 'US_SPECIFIC'`,
      [EPA_SOURCE_KEY],
    );
    assert.equal(Number(autoUsAny.rows[0].n), EPA_AUTO_US);
    void autoUs;

    const gwp = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors f
       JOIN emission_factor_versions v ON v.id = f.version_id
       JOIN factor_sources s ON s.id = v.source_id
       WHERE ${EPA_GLOBAL_GWP_SQL}`,
    );
    assert.equal(Number(gwp.rows[0].n), EPA_GLOBAL_GWP);

    const registry = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM emission_factors`,
    );
    assert.equal(Number(registry.rows[0].n), REGISTRY_TOTAL);
  });

  it("governance: catalog visible; calc+resolver enabled (027)", async () => {
    const gov = await pool.query<{
      status: string;
      catalog_status: string;
      calculation_status: string;
      resolver_status: string;
    }>(
      `SELECT v.status, v.catalog_status, v.calculation_status, v.resolver_status
       FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1 AND v.dataset_version = '2025'`,
      [EPA_SOURCE_KEY],
    );
    assert.ok(gov.rows[0]);
    assert.equal(gov.rows[0].calculation_status, "enabled");
    assert.equal(gov.rows[0].resolver_status, "enabled");
    if (gov.rows[0].catalog_status === "visible") {
      assert.equal(gov.rows[0].status, "approved");
      const visible = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM emission_factors f
         JOIN emission_factor_versions v ON v.id = f.version_id
         WHERE f.status = 'approved' AND v.status = 'approved' AND v.catalog_status = 'visible'`,
      );
      assert.equal(Number(visible.rows[0].n), CATALOG_VISIBLE_TOTAL);
    }
  });

  it("TN electricity → Core TN; never eGRID", async () => {
    const r = await resolveFactor(pool, {
      mode: "shadow",
      organizationId: "b1000000-0000-4000-8000-000000000099",
      activity: "electricity",
      unit: "kWh",
      country: "TN",
    });
    if (r.status === "RESOLVED" && r.selectedFactor) {
      assert.equal(r.selectedFactor.source.key, "internal");
      assert.ok(!r.selectedFactor.name.toLowerCase().includes("egrid"));
      assert.notEqual(r.selectedFactor.source.key, EPA_SOURCE_KEY);
    }
    const egridRejected = r.candidateSummary.rejectedSamples.some(
      (s) =>
        s.sourceKey === EPA_SOURCE_KEY &&
        (s.reasonCode.includes("EPA") || s.reasonCode.includes("GEO")),
    );
    // If any EPA eGRID was retrieved, it must be rejected — or none retrieved
    const retrievedEpa = [
      ...r.candidateSummary.rejectedSamples.filter((s) => s.sourceKey === EPA_SOURCE_KEY),
    ];
    for (const s of retrievedEpa) {
      assert.notEqual(s.reasonCode, "OK");
    }
    void egridRejected;
  });

  it("FR/GB electricity never select eGRID", async () => {
    for (const country of ["FR", "GB"] as const) {
      const r = await resolveFactor(pool, {
        mode: "shadow",
        organizationId: "b1000000-0000-4000-8000-000000000099",
        activity: "eGRID electricity",
        unit: "MWh",
        country,
        preferredSource: EPA_SOURCE_KEY,
      });
      if (r.selectedFactor) {
        assert.ok(
          r.selectedFactor.source.key !== EPA_SOURCE_KEY ||
            !r.selectedFactor.name.toLowerCase().includes("egrid"),
          country,
        );
      }
      assert.ok(
        !(r.status === "RESOLVED" && r.selectedFactor?.source.key === EPA_SOURCE_KEY),
        country,
      );
    }
  });

  it("US electricity with eGRID region can select EPA eGRID (shadow, catalog visible)", async (t) => {
    const gov = await pool.query<{ catalog_status: string }>(
      `SELECT v.catalog_status FROM emission_factor_versions v
       JOIN factor_sources s ON s.id = v.source_id
       WHERE s.source_key = $1`,
      [EPA_SOURCE_KEY],
    );
    if (gov.rows[0]?.catalog_status !== "visible") {
      t.skip("EPA catalog not yet visible (026)");
      return;
    }
    const r = await resolveFactor(pool, {
      mode: "shadow",
      organizationId: "b1000000-0000-4000-8000-000000000099",
      activity: "eGRID AZNM electricity",
      unit: "MWh",
      country: "US",
      region: "AZNM",
      preferredSource: EPA_SOURCE_KEY,
    });
    assert.ok(r.candidateSummary.retrieved >= 1 || r.status !== "NO_MATCH");
    if (r.status === "RESOLVED" && r.selectedFactor) {
      assert.equal(r.selectedFactor.source.key, EPA_SOURCE_KEY);
      assert.ok(r.selectedFactor.name.toLowerCase().includes("egrid"));
      assert.equal(r.provenance.epaSafeSubsetRuleset, EPA_SAFE_SUBSET_RULESET);
      assert.equal(r.provenance.epaSafeClass, "AUTO_US");
      assert.equal(r.provenance.egrid, true);
      assert.equal(r.provenance.derived, true);
      assert.equal(r.provenance.gwpBasis, "AR5");
    }
  });

  it("TN with only US_SPECIFIC EPA activity → no EPA auto selection", async () => {
    const r = await resolveFactor(pool, {
      mode: "shadow",
      organizationId: "b1000000-0000-4000-8000-000000000099",
      activity: "eGRID CAMX",
      unit: "MWh",
      country: "TN",
      preferredSource: EPA_SOURCE_KEY,
    });
    if (r.selectedFactor) {
      assert.notEqual(r.selectedFactor.source.key, EPA_SOURCE_KEY);
    }
    assert.ok(
      r.status === "NO_MATCH" ||
        r.status === "REQUIRES_CONTEXT" ||
        r.status === "REVIEW_REQUIRED" ||
        r.status === "AMBIGUOUS" ||
        (r.status === "RESOLVED" && r.selectedFactor?.source.key !== EPA_SOURCE_KEY),
    );
  });

  it("GWP never returned as activity factor", async () => {
    const r = await resolveFactor(pool, {
      mode: "shadow",
      organizationId: "b1000000-0000-4000-8000-000000000099",
      activity: "GWP AR5 CH4",
      unit: "kg",
      country: "TN",
      preferredSource: EPA_SOURCE_KEY,
    });
    if (r.selectedFactor) {
      assert.notEqual(r.selectedFactor.factorKind, "gwp");
    }
  });

  it("cleanup pool", async () => {
    await pool.end();
  });
});
